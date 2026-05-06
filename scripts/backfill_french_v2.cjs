/**
 * Backfill French translations — V2
 * 1. Excipients: hardcoded + DB ingredients lookup
 * 2. Purposes: split sentences → match individually → DeepL for remainder
 * 3. recommended_use_fr: same approach
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = "https://fotcnfwkzncsxbbvpdpw.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdGNuZndrem5jc3hiYnZwZHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY0MDgsImV4cCI6MjA4ODA2MjQwOH0.0Y1OazcLFBP_FOg-_CIodPbt7-eepZ7CIDaib4E-XK0";
const DEEPL_KEY = "5c24a04c-5e74-4ec5-bc93-759678ff84f3:fx";
const CLEAN = "/Volumes/X10 Pro/health_canada_scraper/data/clean";
const DRY_RUN = process.argv.includes("--dry-run");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function loadClean(name) {
  return JSON.parse(fs.readFileSync(path.join(CLEAN, name + ".json"), "utf8"));
}

// ── DeepL ──
async function deeplTranslate(texts) {
  if (!texts.length) return [];
  const batches = [];
  for (let i = 0; i < texts.length; i += 20) batches.push(texts.slice(i, i + 20));

  const results = [];
  for (const batch of batches) {
    const params = new URLSearchParams();
    batch.forEach(t => params.append("text", t));
    params.append("source_lang", "EN");
    params.append("target_lang", "FR");
    const res = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${DEEPL_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!res.ok) throw new Error(`DeepL error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    results.push(...data.translations.map(t => t.text));
  }
  return results;
}

// ── Sentence splitting ──
function splitSentences(text) {
  return text
    .split(/\n+/)
    .flatMap(line => line.split(/(?<=\.)\s{2,}/))
    .map(s => s.trim())
    .filter(s => s.length > 3);
}

// ── Fuzzy normalization for matching ──
function normalize(s) {
  return s.trim()
    .replace(/\s+/g, " ")
    .replace(/\.$/, "")
    .toLowerCase();
}

async function fetchAll(table, select) {
  let all = [], from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== LIVE BACKFILL V2 ===");

  // ── Load translation tables (exact + normalized) ──
  const pt = loadClean("purpose_translations_en_fr");
  const exactMap = {};
  const normMap = {};
  (pt.translations || []).forEach(t => {
    exactMap[t.en.trim()] = t.fr;
    normMap[normalize(t.en)] = t.fr;
  });
  console.log(`Purpose translations: ${Object.keys(exactMap).length}`);

  // ── 1. Excipients ──
  console.log("\n── Excipients ──");
  const EXCIPIENT_FR = {
    "silica": "Silice",
    "glycerine": "Glycérine",
    "glycerin": "Glycérine",
    "beeswax": "Cire d'abeille",
    "microcrystalline cellulose": "Cellulose microcristalline",
    "magnesium stearate": "Stéarate de magnésium",
    "hypromellose": "Hypromellose",
    "purified water": "Eau purifiée",
    "citric acid": "Acide citrique",
    "stearic acid": "Acide stéarique",
    "titanium dioxide": "Dioxyde de titane",
    "rice flour": "Farine de riz",
    "maltodextrin": "Maltodextrine",
    "gelatin": "Gélatine",
    "croscarmellose sodium": "Croscarmellose sodique",
  };

  const excipients = await fetchAll("excipients", "id, name, name_fr");
  let excUpdated = 0;
  for (const e of excipients) {
    if (e.name_fr) continue;
    const fr = EXCIPIENT_FR[e.name.toLowerCase()];
    if (fr && !DRY_RUN) {
      await supabase.from("excipients").update({ name_fr: fr }).eq("id", e.id);
      excUpdated++;
    } else if (fr) {
      console.log(`  [dry] ${e.name} → ${fr}`);
    }
  }
  // Remaining: try ingredients table
  const stillMissing = excipients.filter(e => !e.name_fr && !EXCIPIENT_FR[e.name.toLowerCase()]);
  for (const e of stillMissing) {
    const { data: ing } = await supabase.from("ingredients").select("name_fr")
      .or(`scientific_name.ilike.${e.name},name_en.ilike.${e.name}`).limit(1).maybeSingle();
    if (ing?.name_fr && !DRY_RUN) {
      await supabase.from("excipients").update({ name_fr: ing.name_fr }).eq("id", e.id);
      excUpdated++;
    }
  }
  console.log(`  Updated ${excUpdated} excipients`);

  // ── 2. Products: purposes_fr + recommended_use_fr ──
  console.log("\n── Products ──");
  const products = await fetchAll("products", "id, npn, purposes_en, purposes_fr, recommended_use, recommended_use_fr");

  // Collect all unique sentences that need translation
  const needDeepL = new Set();

  function matchSentence(s) {
    if (exactMap[s]) return exactMap[s];
    const n = normalize(s);
    if (normMap[n]) return normMap[n];
    // Try without trailing period
    const noDot = s.replace(/\.$/, "").trim();
    if (exactMap[noDot]) return exactMap[noDot];
    if (exactMap[noDot + "."]) return exactMap[noDot + "."];
    return null;
  }

  // First pass: identify what needs DeepL
  const prodWork = [];
  for (const p of products) {
    const work = { id: p.id, update: {}, needsDeepL: [] };
    let changed = false;

    // purposes_fr
    if ((!p.purposes_fr || p.purposes_fr.length === 0) && p.purposes_en?.length > 0) {
      const allSentences = p.purposes_en.flatMap(splitSentences);
      const translated = [];
      const gaps = [];
      for (const s of allSentences) {
        const fr = matchSentence(s);
        if (fr) { translated.push(fr); }
        else { gaps.push(s); needDeepL.add(s); }
      }
      work.purposeSentences = allSentences;
      work.purposeTranslated = translated;
      work.purposeGaps = gaps;
      if (translated.length > 0 || gaps.length > 0) changed = true;
    }

    // recommended_use_fr
    if ((!p.recommended_use_fr || p.recommended_use_fr === "S.O.") && p.recommended_use) {
      const sentences = splitSentences(p.recommended_use);
      const translated = [];
      const gaps = [];
      for (const s of sentences) {
        const fr = matchSentence(s);
        if (fr) { translated.push(fr); }
        else { gaps.push(s); needDeepL.add(s); }
      }
      work.recUseSentences = sentences;
      work.recUseTranslated = translated;
      work.recUseGaps = gaps;
      if (translated.length > 0 || gaps.length > 0) changed = true;
    }

    if (changed) prodWork.push(work);
  }

  console.log(`  Products to update: ${prodWork.length}`);
  console.log(`  Sentences matched by lookup: ${prodWork.reduce((n, w) => n + (w.purposeTranslated?.length || 0) + (w.recUseTranslated?.length || 0), 0)}`);
  console.log(`  Sentences needing DeepL: ${needDeepL.size}`);

  // DeepL translate
  const deeplTexts = [...needDeepL];
  let deeplMap = {};
  if (deeplTexts.length > 0 && !DRY_RUN && !process.argv.includes("--no-deepl")) {
    console.log(`  Calling DeepL for ${deeplTexts.length} sentences...`);
    try {
      const translations = await deeplTranslate(deeplTexts);
      deeplTexts.forEach((en, i) => { deeplMap[en] = translations[i]; });
      console.log(`  DeepL done`);
    } catch (e) {
      console.log(`  DeepL failed: ${e.message} — saving matched sentences only`);
    }
  } else if (deeplTexts.length > 0) {
    console.log(`  Skipping DeepL, saving ${Object.keys(exactMap).length > 0 ? "matched" : "nothing"}`);
  }
  if (deeplTexts.length > 0 && Object.keys(deeplMap).length === 0) {
    console.log(`\n  ── ${deeplTexts.length} sentences still need translation ──`);
    deeplTexts.forEach(s => console.log(`  • ${s.substring(0, 100)}`));
  }

  // Second pass: assemble and save
  let prodUpdated = 0;
  for (const work of prodWork) {
    const update = {};

    if (work.purposeSentences) {
      const allFr = work.purposeSentences.map(s => matchSentence(s) || deeplMap[s] || null).filter(Boolean);
      if (allFr.length > 0) update.purposes_fr = allFr;
    }

    if (work.recUseSentences) {
      const allFr = work.recUseSentences.map(s => matchSentence(s) || deeplMap[s] || null).filter(Boolean);
      if (allFr.length > 0) update.recommended_use_fr = allFr.join(" ");
    }

    if (Object.keys(update).length > 0 && !DRY_RUN) {
      const { error } = await supabase.from("products").update(update).eq("id", work.id);
      if (error) console.log(`  WARN ${work.id}: ${error.message}`);
      else prodUpdated++;
    }
  }
  console.log(`  Updated ${prodUpdated} products`);

  // ── Summary ──
  console.log("\n✓ Backfill V2 complete");
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
