const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const supabase = createClient(
  "https://fotcnfwkzncsxbbvpdpw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdGNuZndrem5jc3hiYnZwZHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY0MDgsImV4cCI6MjA4ODA2MjQwOH0.0Y1OazcLFBP_FOg-_CIodPbt7-eepZ7CIDaib4E-XK0"
);

const TABLES = [
  "products",
  "product_brands",
  "product_medicinal_ingredients",
  "product_excipients",
  "product_labels",
  "common_ingredients",
  "excipients",
  "skus",
  "suppliers",
  "function_categories",
  "sku_functions",
];

async function exportAll() {
  const outDir = path.join(__dirname, "snapshot_" + new Date().toISOString().slice(0, 10));
  fs.mkdirSync(outDir, { recursive: true });

  for (const table of TABLES) {
    let all = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .range(from, from + PAGE - 1);
      if (error) {
        console.log(`  ${table}: ERROR - ${error.message}`);
        break;
      }
      all = all.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    const file = path.join(outDir, `${table}.json`);
    fs.writeFileSync(file, JSON.stringify(all, null, 2));
    console.log(`  ${table}: ${all.length} rows`);
  }

  console.log(`\nSnapshot saved to ${outDir}`);
}

exportAll();
