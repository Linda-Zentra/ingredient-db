/**
 * Backfill French translations into Supabase.
 *
 * Reads translation lookup tables from the volume and updates:
 *   - products.purposes_fr        (from purpose_translations_en_fr.json)
 *   - products.*_fr warning fields (from warning_translations_en_fr.json)
 *   - excipients.name_fr          (from ingredient_lookup_fr.json)
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=... node scripts/backfill_french.cjs
 *   node scripts/backfill_french.cjs --dry-run
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = "https://fotcnfwkzncsxbbvpdpw.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdGNuZndrem5jc3hiYnZwZHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY0MDgsImV4cCI6MjA4ODA2MjQwOH0.0Y1OazcLFBP_FOg-_CIodPbt7-eepZ7CIDaib4E-XK0";
const DRY_RUN = process.argv.includes("--dry-run");
const CLEAN = "/Volumes/X10 Pro/health_canada_scraper/data/clean";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function loadClean(name) {
  const p = path.join(CLEAN, name + ".json");
  if (!fs.existsSync(p)) { console.error("File not found:", p); process.exit(1); }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function fetchAll(table, select) {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
    if (error) throw new Error(`${table} fetch: ${error.message}`);
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== LIVE BACKFILL ===");

  // Load translation tables
  const purposeData = loadClean("purpose_translations_en_fr");
  const purposeMap = {};
  (purposeData.translations || []).forEach(t => { purposeMap[t.en.trim()] = t.fr; });
  console.log(`Loaded ${Object.keys(purposeMap).length} purpose translations`);

  const warningData = loadClean("warning_translations_en_fr");
  const warningMap = {};
  (warningData.translations || []).forEach(t => { warningMap[t.en.trim()] = t.fr; });
  console.log(`Loaded ${Object.keys(warningMap).length} warning translations`);

  const frIngredients = loadClean("ingredient_lookup_fr");
  const excNameFrMap = {};
  frIngredients.forEach(i => {
    if (i.name) excNameFrMap[i.name.toLowerCase()] = i.name;
  });
  // Also build from EN lookup for excipient matching
  const enIngredients = loadClean("ingredient_lookup");
  enIngredients.forEach(i => {
    if (i.name && i.name_fr) excNameFrMap[i.name.toLowerCase()] = i.name_fr;
  });
  console.log(`Loaded ${Object.keys(excNameFrMap).length} ingredient name FR mappings`);

  if (DRY_RUN) {
    console.log("\n[dry-run] Would update products and excipients. Exiting.");
    return;
  }

  // ── 1. Backfill products French fields ──
  console.log("\n── Products ──");
  const products = await fetchAll("products", "id, recommended_use, recommended_use_fr, purposes_en, purposes_fr, do_not_use_en, do_not_use_fr, ask_before_use_en, ask_before_use_fr, when_using_en, when_using_fr, stop_use_en, stop_use_fr, known_adverse_en, known_adverse_fr, other_warnings_en, other_warnings_fr, other_information_en, other_information_fr");

  function translateArr(arr, map) {
    return (arr || []).map(s => map[s.trim()] || null).filter(Boolean);
  }

  let prodUpdated = 0;
  for (const p of products) {
    const update = {};
    let changed = false;

    // purposes_fr
    if ((!p.purposes_fr || p.purposes_fr.length === 0) && p.purposes_en?.length > 0) {
      const fr = translateArr(p.purposes_en, purposeMap);
      if (fr.length > 0) { update.purposes_fr = fr; changed = true; }
    }

    // recommended_use_fr
    if ((!p.recommended_use_fr || p.recommended_use_fr === "S.O.") && p.recommended_use) {
      const fr = purposeMap[p.recommended_use.trim()];
      if (fr) { update.recommended_use_fr = fr; changed = true; }
    }

    // Warning fields
    const warningPairs = [
      ["do_not_use_en", "do_not_use_fr"],
      ["ask_before_use_en", "ask_before_use_fr"],
      ["when_using_en", "when_using_fr"],
      ["stop_use_en", "stop_use_fr"],
      ["known_adverse_en", "known_adverse_fr"],
      ["other_warnings_en", "other_warnings_fr"],
      ["other_information_en", "other_information_fr"],
    ];

    for (const [enKey, frKey] of warningPairs) {
      if ((!p[frKey] || p[frKey].length === 0) && p[enKey]?.length > 0) {
        const fr = translateArr(p[enKey], warningMap);
        if (fr.length > 0) { update[frKey] = fr; changed = true; }
      }
    }

    if (changed) {
      const { error } = await supabase.from("products").update(update).eq("id", p.id);
      if (error) console.log(`  WARN product ${p.id}: ${error.message}`);
      else prodUpdated++;
    }
  }
  console.log(`  Updated ${prodUpdated} / ${products.length} products`);

  // ── 2. Backfill excipients.name_fr ──
  console.log("\n── Excipients ──");
  const excipients = await fetchAll("excipients", "id, name, name_fr");
  let excUpdated = 0;

  for (const e of excipients) {
    if (e.name_fr) continue;
    const fr = excNameFrMap[e.name.toLowerCase()];
    if (fr) {
      const { error } = await supabase.from("excipients").update({ name_fr: fr }).eq("id", e.id);
      if (error) console.log(`  WARN excipient ${e.name}: ${error.message}`);
      else excUpdated++;
    }
  }
  console.log(`  Updated ${excUpdated} / ${excipients.length} excipients`);

  console.log("\n✓ Backfill complete");
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
