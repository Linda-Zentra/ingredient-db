/**
 * Data migration script for V2 restructure.
 *
 * Prerequisites:
 *   1. Snapshot exported (scripts/snapshot_2026-05-02/)
 *   2. New schema applied (20260502000000_v2_full_restructure.sql)
 *   3. SUPABASE_SERVICE_KEY env var set
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=... node scripts/migrate_data.cjs
 *   node scripts/migrate_data.cjs --dry-run   (preview only)
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = "https://fotcnfwkzncsxbbvpdpw.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DRY_RUN = process.argv.includes("--dry-run");

if (!SERVICE_KEY && !DRY_RUN) {
  console.error("Set SUPABASE_SERVICE_KEY or use --dry-run");
  process.exit(1);
}

const supabase = SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY)
  : null;

const SNAPSHOT = path.join(__dirname, "snapshot_2026-05-02");
const CLEAN = "/Volumes/x10 Pro/health_canada_scraper/data/clean";

function loadSnapshot(name) {
  return JSON.parse(fs.readFileSync(path.join(SNAPSHOT, name + ".json"), "utf8"));
}
function loadClean(name) {
  return JSON.parse(fs.readFileSync(path.join(CLEAN, name + ".json"), "utf8"));
}

async function upsertBatch(table, rows, conflict, batchSize = 500) {
  if (DRY_RUN) { console.log(`  [dry-run] ${table}: ${rows.length} rows`); return; }
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: conflict });
    if (error) throw new Error(`${table} upsert failed at batch ${i}: ${error.message}`);
    inserted += batch.length;
  }
  console.log(`  ${table}: ${inserted} rows`);
}

async function insertBatch(table, rows, batchSize = 500) {
  if (DRY_RUN) { console.log(`  [dry-run] ${table}: ${rows.length} rows`); return; }
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`${table} insert failed at batch ${i}: ${error.message}`);
    inserted += batch.length;
  }
  console.log(`  ${table}: ${inserted} rows`);
}

// ═══════════════════════════════════════════════════════════════
// Step 1: Ingredients (from clean data)
// ═══════════════════════════════════════════════════════════════
async function migrateIngredients() {
  console.log("\n── Step 1: Ingredients ──");
  const lookup = loadClean("ingredient_lookup");
  const rows = lookup.map(i => ({
    nhpid_id: i.nhpid_id,
    scientific_name: i.name,
    name_en: (i.common_names || [])[0] || i.name,
    name_fr: (i.common_names_fr || i.common_names_fr || [])[0] || i.name_fr || null,
    common_names_en: i.common_names || [],
    common_names_fr: i.common_names_fr || [],
    proper_names: i.proper_names || [],
    category: i.category || null,
    cas_number: i.cas_number || null,
    source_organisms: (i.source_materials || []).map(sm =>
      typeof sm === "string"
        ? { organism: sm.split(" - ")[0], part: sm.split(" - ")[1] || null }
        : sm
    ),
    is_medicinal: i.roles?.medicinal ?? null,
    is_non_medicinal: i.roles?.non_medicinal ?? null,
    allergen_types: i.allergens || [],
  }));

  await upsertBatch("ingredients", rows, "nhpid_id");

  // Also insert old common_ingredients that don't have nhpid_id
  const oldCi = loadSnapshot("common_ingredients");
  const noNhpid = oldCi.filter(c => !c.nhpid_id);
  if (noNhpid.length > 0) {
    const extra = noNhpid.map(c => ({
      scientific_name: c.scientific_name,
      name_en: c.name_en || c.scientific_name,
      name_fr: c.name_fr || null,
      common_names_en: c.common_names_en || [],
      common_names_fr: c.common_names_fr || [],
      proper_names: c.proper_names || [],
      category: c.category || null,
      cas_number: c.cas_number || null,
      source_organisms: c.source_organisms || [],
      is_medicinal: c.is_medicinal ?? null,
      is_non_medicinal: c.is_non_medicinal ?? null,
      allergen_types: c.allergen_types || [],
    }));
    await upsertBatch("ingredients", extra, "scientific_name");
    console.log(`  (${extra.length} extra from old common_ingredients without nhpid_id)`);
  }

  return rows.length + noNhpid.length;
}

// ═══════════════════════════════════════════════════════════════
// Step 2: Build old_ci_id → new ingredient_id mapping
// ═══════════════════════════════════════════════════════════════
async function buildIngredientMap() {
  console.log("\n── Step 2: Build ingredient ID mapping ──");
  const oldCi = loadSnapshot("common_ingredients");

  if (DRY_RUN) {
    console.log(`  [dry-run] Would map ${oldCi.length} common_ingredients`);
    return {};
  }

  // Fetch all new ingredients
  let allNew = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("ingredients").select("id, nhpid_id, scientific_name")
      .range(from, from + 999);
    if (error) throw error;
    allNew = allNew.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const byNhpid = {};
  const bySciName = {};
  allNew.forEach(n => {
    if (n.nhpid_id) byNhpid[n.nhpid_id] = n.id;
    bySciName[n.scientific_name.toLowerCase()] = n.id;
  });

  const map = {};
  let matched = 0, missed = 0;
  for (const old of oldCi) {
    let newId = null;
    if (old.nhpid_id && byNhpid[old.nhpid_id]) {
      newId = byNhpid[old.nhpid_id];
    } else {
      newId = bySciName[old.scientific_name.toLowerCase()] || null;
    }
    if (newId) {
      map[old.id] = newId;
      matched++;
    } else {
      missed++;
      console.log(`  WARN: unmapped old ci id=${old.id} "${old.scientific_name}"`);
    }
  }
  console.log(`  Mapped: ${matched}, Unmapped: ${missed}`);
  return map;
}

// ═══════════════════════════════════════════════════════════════
// Step 3: Excipients
// ═══════════════════════════════════════════════════════════════
async function migrateExcipients() {
  console.log("\n── Step 3: Excipients ──");

  // Start with clean data excipients for Nutrizen products
  const cleanProducts = loadClean("products");
  const nutrizenIds = new Set(
    cleanProducts
      .filter(p => p.company_name === "Nutrizen Station Lab Inc.")
      .map(p => p.lnhpd_id)
  );
  const cleanExc = loadClean("product_excipients");
  const nutrizenExcNames = new Set(
    cleanExc.filter(e => nutrizenIds.has(e.lnhpd_id)).map(e => e.ingredient_name)
  );

  // Also include old excipients from snapshot
  const oldExc = loadSnapshot("excipients");
  oldExc.forEach(e => nutrizenExcNames.add(e.name));

  // Build lookup for French names from clean data
  const lookupFr = {};
  const cleanIngLookup = loadClean("ingredient_lookup_fr");
  if (Array.isArray(cleanIngLookup)) {
    cleanIngLookup.forEach(i => { if (i.name && i.name_fr) lookupFr[i.name.toLowerCase()] = i.name_fr; });
  }

  const rows = [...nutrizenExcNames].map(name => ({
    name,
    name_fr: oldExc.find(e => e.name === name)?.name_fr || lookupFr[name.toLowerCase()] || null,
    allergen_types: oldExc.find(e => e.name === name)?.allergen_types || [],
  }));

  await upsertBatch("excipients", rows, "name");
}

// ═══════════════════════════════════════════════════════════════
// Step 4: Suppliers
// ═══════════════════════════════════════════════════════════════
async function migrateSuppliers() {
  console.log("\n── Step 4: Suppliers ──");
  const old = loadSnapshot("suppliers");
  const rows = old.map(s => ({
    supplier_name: s.supplier_name,
    contact_email: s.contact_email || null,
    is_account_opened: s.is_account_opened || null,
    agreement_signed: s.agreement_signed || null,
  }));
  await insertBatch("suppliers", rows);

  // Return old_id → new_id map
  if (DRY_RUN) return {};
  const { data: newSuppliers } = await supabase.from("suppliers").select("id, supplier_name");
  const map = {};
  old.forEach(o => {
    const n = newSuppliers.find(s => s.supplier_name === o.supplier_name);
    if (n) map[o.id] = n.id;
  });
  console.log(`  Mapped ${Object.keys(map).length} suppliers`);
  return map;
}

// ═══════════════════════════════════════════════════════════════
// Step 5: Function categories
// ═══════════════════════════════════════════════════════════════
async function migrateFunctionCategories() {
  console.log("\n── Step 5: Function categories ──");
  const old = loadSnapshot("function_categories");
  const rows = old.map(c => ({
    name_zh: c.name_zh || null,
    name_en: c.name_en || null,
    color: c.color || null,
  }));
  await insertBatch("function_categories", rows);

  if (DRY_RUN) return {};
  const { data: newCats } = await supabase.from("function_categories").select("id, name_zh, name_en");
  const map = {};
  old.forEach(o => {
    const n = newCats.find(c => c.name_zh === o.name_zh && c.name_en === o.name_en);
    if (n) map[o.id] = n.id;
  });
  console.log(`  Mapped ${Object.keys(map).length} categories`);
  return map;
}

// ═══════════════════════════════════════════════════════════════
// Step 6: SKUs (needs supplier + ingredient maps)
// ═══════════════════════════════════════════════════════════════
async function migrateSkus(supplierMap, ingredientMap) {
  console.log("\n── Step 6: SKUs ──");
  const old = loadSnapshot("skus");
  const rows = old.map(s => ({
    supplier_id: supplierMap[s.supplier_id] || null,
    ingredient_id: s.common_ingredient_id ? (ingredientMap[s.common_ingredient_id] || null) : null,
    ingredient_name: s.ingredient_name || null,
    region: s.region || null,
    form_potency: s.form_potency || null,
    ingredient: s.ingredient || null,
    extraction_ratio_source: s.extraction_ratio_source || null,
    lead_time: s.lead_time || null,
    expire_date: s.expire_date || null,
    price_usd_kg: s.price_usd_kg || null,
    price_cad_kg: s.price_cad_kg || null,
    daily_recommended_dose: s.daily_recommended_dose || null,
    health_canada_monograph: s.health_canada_monograph || null,
    moq_kg: s.moq_kg || null,
    can_apply_npn: s.can_apply_npn || null,
    npn_notes: s.npn_notes || null,
    applicable_gender: s.applicable_gender || null,
    applicable_population: s.applicable_population || null,
    authorization_claims: s.authorization_claims || null,
    notes: s.notes || null,
    certificates: s.certificates || null,
  }));
  await insertBatch("skus", rows);

  if (DRY_RUN) return {};
  // Build old_sku_id → new_sku_id map by position (since we inserted in order)
  const { data: newSkus } = await supabase.from("skus").select("id").order("id");
  const map = {};
  old.forEach((o, i) => {
    if (newSkus[i]) map[o.id] = newSkus[i].id;
  });
  console.log(`  Mapped ${Object.keys(map).length} SKUs`);
  return map;
}

// ═══════════════════════════════════════════════════════════════
// Step 7: Sku functions (junction)
// ═══════════════════════════════════════════════════════════════
async function migrateSkuFunctions(skuMap, catMap) {
  console.log("\n── Step 7: SKU functions ──");
  const old = loadSnapshot("sku_functions");
  const rows = old
    .filter(sf => skuMap[sf.sku_id] && catMap[sf.category_id])
    .map(sf => ({
      sku_id: skuMap[sf.sku_id],
      category_id: catMap[sf.category_id],
    }));
  await insertBatch("sku_functions", rows);
}

// ═══════════════════════════════════════════════════════════════
// Step 8: Products (merge products + product_labels)
// ═══════════════════════════════════════════════════════════════
async function migrateProducts() {
  console.log("\n── Step 8: Products ──");
  const oldProducts = loadSnapshot("products");
  const oldLabels = loadSnapshot("product_labels");

  // Clean data for Nutrizen products (keyed by NPN)
  const cleanProducts = loadClean("products_table");
  const cleanByNpn = {};
  cleanProducts.forEach(p => { cleanByNpn[p.licence_number] = p; });

  const cleanFull = loadClean("products");
  const cleanFullByNpn = {};
  cleanFull.forEach(p => { cleanFullByNpn[p.licence_number] = p; });

  // Also get purposes from clean data
  const cleanPurposes = loadClean("product_purposes");
  const purposesByLnhpd = {};
  cleanPurposes.forEach(p => {
    if (!purposesByLnhpd[p.lnhpd_id]) purposesByLnhpd[p.lnhpd_id] = [];
    purposesByLnhpd[p.lnhpd_id].push(p.purpose);
  });

  // Purpose and warning translations
  let warningTranslations = {};
  let purposeTranslations = {};
  try {
    const wt = loadClean("warning_translations_en_fr");
    (wt.translations || []).forEach(t => { warningTranslations[t.en] = t.fr; });
    const pt = loadClean("purpose_translations_en_fr");
    (pt.translations || []).forEach(t => { purposeTranslations[t.en] = t.fr; });
  } catch (e) { console.log("  WARN: translations not loaded:", e.message); }

  function translateWarnings(arr) {
    return (arr || []).map(w => warningTranslations[w] || null).filter(Boolean);
  }
  function translatePurposes(arr) {
    return (arr || []).map(p => purposeTranslations[p] || null).filter(Boolean);
  }

  const rows = oldProducts.map(p => {
    const npnStr = p.npn ? String(p.npn) : null;
    const label = oldLabels.find(l => l.product_id === p.id) || {};
    const clean = npnStr ? cleanByNpn[npnStr] : null;

    // Prefer clean data for warnings, fall back to old product_labels
    const askEn = clean?.ask_before_use_en || label.ask_before_use_en || [];
    const stopEn = clean?.stop_use_en || label.stop_use_en || [];
    const doNotUseEn = clean?.do_not_use_en || label.do_not_use_en || [];
    const whenUsingEn = clean?.when_using_en || label.when_using_en || [];
    const knownAdverseEn = clean?.known_adverse_reactions_en || label.known_adverse_en || [];
    const otherWarningsEn = clean?.other_warnings_en || label.other_warnings_en || [];
    const otherInfoEn = clean?.other_information_en || label.other_information_en || [];

    // Purposes: prefer clean data
    const cleanProd = npnStr ? cleanFullByNpn[npnStr] : null;
    const purposesEn = label.purposes_en?.length ? label.purposes_en : (cleanProd?.purposes || []);

    return {
      npn: npnStr,
      lnhpd_id: clean?.lnhpd_id ? String(clean.lnhpd_id) : null,
      product_name: cleanProd?.product_name || p.product_name || null,
      product_name_zh: label.product_name_zh || null,

      dosage_form_type: p.dosage_form_type || null,
      dosage_form_subtype: p.dosage_form_subtype || null,
      dose_amount: p.dose_amount ?? null,
      dose_amount_max: p.dose_amount_max ?? null,
      dose_unit: p.dose_unit || null,
      dose_freq_min: p.dose_freq_min ?? null,
      dose_freq_max: p.dose_freq_max ?? null,
      dose_freq_unit: p.dose_freq_unit || null,
      dose_population: label.dose_population || clean?.doses?.[0]?.population || null,
      dose_min_age: label.dose_min_age ?? clean?.doses?.[0]?.age_min ?? null,

      purposes_en: purposesEn,
      purposes_fr: translatePurposes(purposesEn),
      recommended_use: label.recommended_use || null,
      recommended_use_fr: label.recommended_use_fr || null,

      for_external_use_en: clean?.for_external_use_en || null,
      for_external_use_fr: clean?.for_external_use_fr || null,
      do_not_use_en: doNotUseEn,
      do_not_use_fr: clean?.do_not_use_fr || translateWarnings(doNotUseEn),
      ask_before_use_en: askEn,
      ask_before_use_fr: clean?.ask_before_use_fr || translateWarnings(askEn),
      when_using_en: whenUsingEn,
      when_using_fr: clean?.when_using_fr || translateWarnings(whenUsingEn),
      stop_use_en: stopEn,
      stop_use_fr: clean?.stop_use_fr || translateWarnings(stopEn),
      keep_out_overdose_en: clean?.keep_out_overdose_en || null,
      keep_out_overdose_fr: clean?.keep_out_overdose_fr || null,
      other_warnings_en: otherWarningsEn,
      other_warnings_fr: clean?.other_warnings_fr || translateWarnings(otherWarningsEn),
      known_adverse_en: knownAdverseEn,
      known_adverse_fr: clean?.known_adverse_reactions_fr || translateWarnings(knownAdverseEn),
      other_information_en: otherInfoEn,
      other_information_fr: clean?.other_information_fr || translateWarnings(otherInfoEn),

      licensing_status: p.licensing_status || "not_started",
      is_marketed: p.is_marketed ?? false,
      price_cad: p.price_cad ?? null,
      price_usd: p.price_usd ?? null,
      notes: p.notes || null,
    };
  });

  await insertBatch("products", rows);

  // Return old_product_id → new_product_id map
  if (DRY_RUN) return {};
  let allNew = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from("products").select("id, npn").range(from, from + 999);
    allNew = allNew.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  const map = {};
  oldProducts.forEach(op => {
    const npnStr = op.npn ? String(op.npn) : null;
    if (npnStr) {
      const n = allNew.find(p => p.npn === npnStr);
      if (n) map[op.id] = n.id;
    }
  });
  // For products without NPN, match by position in insertion order
  const noNpnOld = oldProducts.filter(p => !p.npn);
  const noNpnNew = allNew.filter(p => !p.npn);
  noNpnOld.forEach((op, i) => {
    if (noNpnNew[i]) map[op.id] = noNpnNew[i].id;
  });
  console.log(`  Mapped ${Object.keys(map).length} / ${oldProducts.length} products`);
  return map;
}

// ═══════════════════════════════════════════════════════════════
// Step 9: Product ingredients
// ═══════════════════════════════════════════════════════════════
async function migrateProductIngredients(productMap, ingredientMap, skuMap) {
  console.log("\n── Step 9: Product ingredients ──");
  const old = loadSnapshot("product_medicinal_ingredients");
  const rows = old
    .filter(pmi => productMap[pmi.product_id] && ingredientMap[pmi.common_ingredient_id])
    .map(pmi => ({
      product_id: productMap[pmi.product_id],
      ingredient_id: ingredientMap[pmi.common_ingredient_id],
      sku_id: pmi.sku_id ? (skuMap[pmi.sku_id] || null) : null,
      amount_value: pmi.amount_value ?? null,
      amount_unit: pmi.amount_unit || null,
      extract_ratio: pmi.extract_ratio || null,
      extract_type: pmi.extract_type || null,
      dried_herb_equivalent: pmi.dried_herb_equivalent ?? null,
      dhe_unit: pmi.dhe_unit || null,
      potency_amount: pmi.potency_amount ?? null,
      potency_label: pmi.potency_label || null,
      source_material: pmi.source_material || null,
      source_part: pmi.source_part || null,
      sort_order: pmi.sort_order ?? 0,
    }));

  const skipped = old.length - rows.length;
  if (skipped) console.log(`  WARN: ${skipped} rows skipped (unmapped product or ingredient)`);
  await insertBatch("product_ingredients", rows);
}

// ═══════════════════════════════════════════════════════════════
// Step 10: Product excipients
// ═══════════════════════════════════════════════════════════════
async function migrateProductExcipients(productMap) {
  console.log("\n── Step 10: Product excipients ──");
  const oldPE = loadSnapshot("product_excipients");
  const oldExc = loadSnapshot("excipients");

  if (DRY_RUN) {
    console.log(`  [dry-run] ${oldPE.length} rows`);
    return;
  }

  // Build old excipient name → new excipient id
  const { data: newExc } = await supabase.from("excipients").select("id, name");
  const excMap = {};
  oldExc.forEach(o => {
    const n = newExc.find(e => e.name === o.name);
    if (n) excMap[o.id] = n.id;
  });

  const rows = oldPE
    .filter(pe => productMap[pe.product_id] && excMap[pe.excipient_id])
    .map(pe => ({
      product_id: productMap[pe.product_id],
      excipient_id: excMap[pe.excipient_id],
    }));

  await insertBatch("product_excipients", rows);
}

// ═══════════════════════════════════════════════════════════════
// Step 11: Product brands
// ═══════════════════════════════════════════════════════════════
async function migrateProductBrands(productMap) {
  console.log("\n── Step 11: Product brands ──");
  const old = loadSnapshot("product_brands");
  const rows = old
    .filter(pb => productMap[pb.product_id])
    .map(pb => ({
      product_id: productMap[pb.product_id],
      brand_name: pb.brand_name,
      is_default: pb.is_default ?? false,
    }));
  await insertBatch("product_brands", rows);
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== LIVE MIGRATION ===");

  await migrateIngredients();
  const ingredientMap = await buildIngredientMap();
  await migrateExcipients();
  const supplierMap = await migrateSuppliers();
  const catMap = await migrateFunctionCategories();
  const skuMap = await migrateSkus(supplierMap, ingredientMap);
  await migrateSkuFunctions(skuMap, catMap);
  const productMap = await migrateProducts();
  await migrateProductIngredients(productMap, ingredientMap, skuMap);
  await migrateProductExcipients(productMap);
  await migrateProductBrands(productMap);

  console.log("\n✓ Migration complete");
}

main().catch(e => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
