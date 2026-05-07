import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { detectAllergens } from "../_shared/detectAllergens.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const CORS_ORIGIN = Deno.env.get("CORS_ORIGIN") ?? "*";
const HC_BASE = "https://health-products.canada.ca/api/natural-licences";

const corsHeaders = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── 1. UNIT NORMALIZATION ───────────────────────────────────────────────────

const UNIT_MAP: Record<string, string | null> = {
  // Mass
  "mg": "mg", "milligrams": "mg", "milligram": "mg",
  "mcg": "mcg", "micrograms": "mcg", "microgram": "mcg", "µg": "mcg",
  "g": "g", "grams": "g", "gram": "g",
  // Mass with qualifier
  "mcg rae": "mcg RAE", "µg rae": "mcg RAE",
  "microgram rae": "mcg RAE", "mg rae": "mg RAE",
  "mcg at": "mcg AT", "microgram at": "mcg AT",
  "mg at": "mg AT", "mg ate": "mg ATE",
  "milligrams alpha-tocopherol": "mg AT", "at": "mg AT",
  "mg aie": "mg AIE",
  // Volume
  "ml": "mL", "millilitre": "mL", "milliliter": "mL",
  "mg/ml": "mg/mL", "mcg/ml": "mcg/mL",
  "ml/ml": "mL/mL", "g/ml": "g/mL",
  "µl": "µL", "mcl": "µL", "µl/ml": "µL/mL",
  // Concentration / ratio
  "mg/g": "mg/g", "g/g": "g/g", "mg/capsule": "mg/capsule",
  "mmol/l": "mmol/L", "meq": "mEq",
  // Percent
  "%": "%", "percent": "%",
  "% (w/w)": "% w/w", "% p/p": "% w/w",
  "% (w/v)": "% w/v", "% p/v": "% w/v",
  "% (v/v)": "% v/v",
  // Homeopathic dilutions
  "x": "X", "c": "C", "d": "D", "ch": "CH", "dh": "DH",
  "ck": "CK", "k": "K", "m": "M", "lm": "LM", "mt": "MT", "tm": "TM",
  // Probiotics
  "billion cfu": "billion CFU",
  "million cfu": "million CFU",
  "cfu": "CFU",
  "billion colony forming units per gram": "billion CFU/g",
  "billion cfu/g": "billion CFU/g",
  // International / pharmacopoeial
  "iu": "IU", "international units": "IU",
  // FCC enzyme units
  "fcc pu": "FCC PU", "fcc lu": "FCC LU", "fcc cu": "FCC CU",
  "fcc du": "FCC DU", "fcc ftu": "FCC FTU", "fcc bgu": "FCC BGU",
  "fcc pc": "FCC PC", "fcc alu": "FCC ALU", "fcc hcu": "FCC HCU",
  "fcc hut": "FCC HUT", "fcc sapu": "FCC SAPU", "fcc su": "FCC SU",
  "fcc agu": "FCC AGU", "fcc invu": "FCC INVU", "fcc galu": "FCC GalU",
  "fcc units": "FCC Units", "fcc sumner units": "FCC Sumner units",
  "fcc alpha-amylase dextrinizing units": "FCC alpha-amylase dextrinizing units",
  "fcc bacterial protease units": "FCC bacterial protease units",
  "fcc papain units": "FCC papain units",
  "fcc degrees of diastatic power units": "FCC degrees of diastatic power units",
  "fcc glucoamylase units": "FCC Glucoamylase Units",
  // Other enzyme/activity units
  "gdu": "GDU", "spu": "SPU", "pu": "PU", "xu": "XU",
  "fip": "FIP", "fip lipase units": "FIP Lipase Units",
  "endo-pgu": "Endo-PGU", "endo-pg": "Endo-PG",
  "xylanase activity units": "Xylanase activity units",
  "usp units of amylase activity": "USP units of amylase activity",
  "usp units of protease activity": "USP units of protease activity",
  "usp units of lipase activity": "USP units of lipase activity",
  "gelatin digesting units per gram": "Gelatin digesting units per gram",
  // Misc
  "drop(s)": "drop(s)",
  // Unknown / TBA → null
  "quantity unit tba": null,
  "": null,
};

function normalizeUnit(raw: string | null): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (key in UNIT_MAP) return UNIT_MAP[key];
  return raw.trim() || null;
}

// ── 2. RISK TEXT CLEANING ───────────────────────────────────────────────────

const FR_PATTERNS = [
  /\bconsultez\b/i,
  /\bne pas\b/i,
  /\butiliser\b/i,
  /\béviter\b/i,
  /\ba eviter\b/i,
  /\bpraticien de soins\b/i,
  /\bfournisseur de soins\b/i,
  /\bconsulter (un|votre|une)\b/i,
  /\bsi (vous|les symptômes)\b/i,
];

const NONE_SET = new Set([
  'none', 'no', 'not', 'known', 'found', 'reported', 'report', 'reports',
  'applicable', 'available', 'listed', 'n/a', 'na', 'contraindications',
]);

function isNoneVariant(s: string): boolean {
  const words = s.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/);
  return words.length > 0 && words.every(w => NONE_SET.has(w));
}

function isFrench(s: string): boolean {
  return FR_PATTERNS.some(re => re.test(s));
}

function preprocess(raw: string): string {
  return raw
    .replace(/\s*\(please note[^)]*\)/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .flatMap(s => s.split(/\n+/))
    .flatMap(s => s.split(/\s*·\s*/))
    .map(s => s.trim())
    .filter(s => s.length >= 10)
    .filter(s => !/\b(if|when|since|because)\s*$/i.test(s));
}

function toSentenceCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const HCP_LIST = "(?:health\\s*care\\s*pract\\w+|health\\s*care\\s*provider|health\\s*care\\s*professional|doctor|physician)";
const HCP_ANY  = `${HCP_LIST}(?:\\s*\\/\\s*${HCP_LIST})*`;
const PREAMBLE_RE = new RegExp(
  `^(?:` +
    `as\\s+with\\s+any\\s+natural\\s+health\\s+product[^,]*,\\s+you\\s+should\\s+consult\\s+a\\s+health\\s*care\\s*pract\\w+\\s+on\\s+the\\s+use\\s+of\\s+this\\s+product\\s+especially\\s+if\\s+` +
  `|` +
    `consult\\s+(?:a\\s+)?${HCP_ANY}\\s+(?:prior\\s+to\\s+use\\s+)?(?:before\\s+use\\s+)?if\\s+` +
  `|` +
    `ask\\s+(?:a\\s+)?${HCP_ANY}\\s+(?:prior\\s+to\\s+use\\s+)?(?:before\\s+use\\s+)?if\\s+` +
  `|` +
    `stop\\s+use\\s+and\\s+consult\\s+(?:a\\s+)?${HCP_ANY}\\s+if\\s+` +
  `)`,
  "i"
);

function stripPreamble(s: string): string {
  const match = s.match(PREAMBLE_RE);
  if (!match) return s;
  const remainder = s.slice(match[0].length).trim();
  if (remainder.length < 5) return s;
  return toSentenceCase(remainder);
}

const TCM_PATTERNS = [
  /according to (tcm|tmc|traditional chinese medicine|traditionally chinese medicine)/i,
  /tcm practitioner/i,
  /\b(liver yang|qi deficiency|yin deficiency|damp obstruction|qi stagnation)\b/i,
  /\b(stomach fire|exterior excess|food stagnation)\b/i,
  /\b(cold|hot|warm|cool) in (its )?nature\b/i,
  /\bayurved/i,
];

function isTCM(s: string): boolean {
  return TCM_PATTERNS.some(re => re.test(s));
}

type Bucket =
  | 'for_external_use'
  | 'flammability'
  | 'choking'
  | 'do_not_use'
  | 'ask_before_use'
  | 'when_using'
  | 'stop_use'
  | 'keep_out'
  | 'overdose'
  | 'other_information'
  | 'other_warnings';

function classify(s: string): Bucket {
  if (/\b(store|refrigerate|freeze|keep tightly|keep in a cool)\b/i.test(s)) return 'other_information';
  if (/\bswallow (whole|tablets?|capsules?)\b/i.test(s)) return 'other_information';
  if (/\bdo not exceed (the )?recommended (daily )?dosage\b/i.test(s)) return 'other_information';
  if (/this product is (double )?safety sealed/i.test(s)) return 'other_information';

  if (/keep out of reach/i.test(s)) return 'keep_out';

  if (/\boverdose\b/i.test(s)) return 'overdose';
  if (/poison control/i.test(s)) return 'overdose';
  if (/(seriously harm a child|enough (drug|iron) in this package)/i.test(s)) return 'overdose';

  if (/for (external|topical|rectal|vaginal|ophthalmic|nasal|otic|oral) use only/i.test(s)) return 'for_external_use';

  if (/\bflammable\b/i.test(s)) return 'flammability';
  if (/pressurized container/i.test(s)) return 'flammability';
  if (/keep away from (fire|heat|flame)/i.test(s)) return 'flammability';

  if (/\bchoking\b/i.test(s)) return 'choking';

  if (/do\s+not\s+use/i.test(s)) return 'do_not_use';
  if (/\bcontraindicated\b/i.test(s)) return 'do_not_use';
  if (/not to be (taken|used) by/i.test(s)) return 'do_not_use';
  if (/a diagnosis of .{0,60} should (be )?obtained before using/i.test(s)) return 'do_not_use';

  if (/\bstop (use|using)\b/i.test(s)) return 'stop_use';
  if (/\b(cease|dis?continue)\b/i.test(s)) return 'stop_use';
  if (/symptoms? (persist|worsens?)/i.test(s)) return 'stop_use';
  if (/persist(s)? (for more than|longer than)/i.test(s)) return 'stop_use';
  if (/(if|in case of) (you experience|an? allergic reaction)/i.test(s)) return 'stop_use';

  if (/when using this product/i.test(s)) return 'when_using';
  if (/while (taking|using) this/i.test(s)) return 'when_using';
  if (/exercise caution (if|when) (operating|driving)/i.test(s)) return 'when_using';
  if (/do not (drive|operate machinery)/i.test(s)) return 'when_using';
  if (/avoid (prolonged|taking with|consumption of)/i.test(s)) return 'when_using';
  if (/\btake (with food|at least \d|a few hours)\b/i.test(s)) return 'when_using';
  if (/not intended as a substitute for sleep/i.test(s)) return 'when_using';
  if (/(not recommended|consumption).{0,40}(caffeine|alcohol|sedativ)/i.test(s)) return 'when_using';

  if (/consult.{0,50}(practitioner|physician|provider|dentist).{0,80}(if|before|prior|for)/i.test(s)) return 'ask_before_use';
  if (/\b(before|prior\s+to)\s+use\b/i.test(s)) return 'ask_before_use';
  if (/\bbefore using (this product|if you)\b/i.test(s)) return 'ask_before_use';
  if (/\btalk to your (health care|doctor|physician)\b/i.test(s)) return 'ask_before_use';
  if (/if you are (pregnant|breastfeeding|nursing)\b/i.test(s)) return 'ask_before_use';
  if (/should not be used (by|in|during)/i.test(s)) return 'ask_before_use';
  if (/(children under \d|adult(s)? (use |only)|for adult)/i.test(s)) return 'ask_before_use';
  if (/use with caution if/i.test(s)) return 'ask_before_use';
  if (/supervised in the use of this product/i.test(s)) return 'ask_before_use';

  return 'other_warnings';
}

interface RiskRow { risk_type_desc: string; risk_text: string; }

function cleanRiskRows(rows: RiskRow[]): Record<string, string | string[] | null> {
  const out: Record<string, string | string[] | null> = {
    for_external_use_en:   null,
    do_not_use_en:         [],
    ask_before_use_en:     [],
    when_using_en:         [],
    stop_use_en:           [],
    keep_out_overdose_en:  null,
    known_adverse_en:      [],
    other_warnings_en:     [],
    other_information_en:  [],
  };

  const FIELD_MAP: Record<string, string> = {
    for_external_use:  'for_external_use_en',
    flammability:      'other_warnings_en',
    choking:           'other_warnings_en',
    do_not_use:        'do_not_use_en',
    ask_before_use:    'ask_before_use_en',
    when_using:        'when_using_en',
    stop_use:          'stop_use_en',
    overdose:          'keep_out_overdose_en',
    other_information: 'other_information_en',
    other_warnings:    'other_warnings_en',
  };

  const seen = new Set<string>();

  function push(field: string, sentence: string): void {
    const key = sentence.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return;
    seen.add(key);
    const val = stripPreamble(sentence.trim());
    if (field === 'for_external_use_en' || field === 'keep_out_overdose_en') {
      if (!out[field]) out[field] = val;
    } else {
      (out[field] as string[]).push(val);
    }
  }

  for (const row of rows) {
    if (!row.risk_text?.trim()) continue;
    const sentences = splitSentences(preprocess(row.risk_text));

    if (row.risk_type_desc === 'Known Adverse Reactions') {
      for (const s of sentences) {
        if (isFrench(s) || isNoneVariant(s)) continue;
        push('known_adverse_en', s);
      }
      continue;
    }

    for (const s of sentences) {
      if (isFrench(s) || isNoneVariant(s)) continue;
      if (isTCM(s)) { push('other_warnings_en', s); continue; }

      const bucket = classify(s);
      if (bucket === 'keep_out') continue;

      const resolvedBucket =
        bucket === 'other_warnings' && row.risk_type_desc === 'Contra-Indications'
          ? 'do_not_use'
          : bucket;

      push(FIELD_MAP[resolvedBucket], s);
    }
  }

  return out;
}

// ── 3. INGREDIENT HELPERS ───────────────────────────────────────────────────

const COMPARABLE_UNITS = new Set(["g", "mg", "mcg", "µg", "ug", "ml", "mL", "l", "L"]);

function isMassUnit(unit: string | null): boolean {
  return COMPARABLE_UNITS.has((unit ?? "").trim());
}

function toMcg(value: any, unit: string | null): number {
  if (!isMassUnit(unit)) return 0;
  const v = parseFloat(String(value ?? 0)) || 0;
  const u = (unit ?? "").trim().toLowerCase();
  if (u === "mcg" || u === "µg" || u === "ug") return v;
  if (u === "mg"  || u === "ml")               return v * 1_000;
  if (u === "g"   || u === "l")                return v * 1_000_000;
  return 0;
}

function normalizeIngredientKey(name: string): string {
  return name
    .normalize("NFC")
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u0060\u00B4\uFF07]/g, "'");
}

function extractSourcePart(sourceMaterial: string): string {
  const idx = sourceMaterial.indexOf(' - ');
  return idx !== -1
    ? sourceMaterial.slice(idx + 3).trim()
    : sourceMaterial.trim();
}

function mergeIngredients(items: any[]): any[] {
  const groups = new Map<string, any[]>();
  for (const item of items) {
    const key = normalizeIngredientKey(item.ingredient_name ?? "");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const result: any[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) { result.push(group[0]); continue; }
    const massEntry    = group.find(i => isMassUnit(i.quantity_unit_of_measure));
    const potencyEntry = group.find(i => !isMassUnit(i.quantity_unit_of_measure) && i.quantity);
    if (massEntry && potencyEntry) {
      result.push({
        ...massEntry,
        potency_amount: potencyEntry.quantity,
        potency_label:  potencyEntry.quantity_unit_of_measure,
      });
    } else {
      result.push(group[0]);
    }
  }
  return result;
}

// ── 4. HC API HELPER ────────────────────────────────────────────────────────

async function fetchHC(endpoint: string, id: string, lang = "en") {
  const url = `${HC_BASE}/${endpoint}/?id=${id}&lang=${lang}&type=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? json;
}

// ── 5. MAIN HANDLER ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { npns } = await req.json();
    if (!npns || !Array.isArray(npns) || npns.length === 0) {
      return new Response(JSON.stringify({ error: "npns array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for data operations (bypasses RLS intentionally)
    const supabase = createClient(
      SUPABASE_URL,
      Deno.env.get("SERVICE_KEY") ?? ""
    );

    const results = await Promise.all(npns.map(npn => importOne(String(npn), supabase)));

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function importOne(npn: string, supabase: any) {
  try {
    // Step 1: NPN → licence info + lnhpd_id
    const licences = await fetchHC("productlicence", npn);
    if (!licences || licences.length === 0) {
      return { npn, success: false, error: "NPN not found on Health Canada" };
    }

    const primary = licences.find((l: any) => l.flag_primary_name === 1) ?? licences[0];
    const lnhpd_id = String(primary.lnhpd_id);

    // Step 2: parallel fetch all data (EN + FR)
    const [
      purposeEN, purposeFR,
      riskEN,
      dose,
      medicinalEN, medicinalFR,
      nonMedEN, nonMedFR,
    ] = await Promise.all([
      fetchHC("productpurpose", lnhpd_id, "en"),
      fetchHC("productpurpose", lnhpd_id, "fr"),
      fetchHC("productrisk", lnhpd_id, "en"),
      fetchHC("productdose", lnhpd_id, "en"),
      fetchHC("medicinalingredient", lnhpd_id, "en"),
      fetchHC("medicinalingredient", lnhpd_id, "fr"),
      fetchHC("nonmedicinalingredient", lnhpd_id, "en"),
      fetchHC("nonmedicinalingredient", lnhpd_id, "fr"),
    ]);

    // Step 3: clean & structure data
    const doseData = dose?.[0] ?? null;
    const dosageFormParts = (primary.dosage_form ?? "").split(",").map((s: string) => s.trim());

    // Purposes: split and deduplicate
    const SO_RE = /^s\.?\s*o\.?$|^n\/?a$/i;
    const purposes_en = (purposeEN ?? []).map((p: any) => p.purpose).filter((p: string) => p && !SO_RE.test(p.trim()));
    const enPurposeSet = new Set(purposes_en.map((p: string) => p.trim().toLowerCase()));
    const purposes_fr = (purposeFR ?? []).map((p: any) => p.purpose).filter((p: string) =>
      p && !SO_RE.test(p.trim()) && !enPurposeSet.has(p.trim().toLowerCase())
    );

    // Risk: classify into buckets
    const riskFields = cleanRiskRows(riskEN ?? []);

    // Step 4: upsert products (V2: includes fields formerly on product_labels)
    const recommended_use = purposeEN?.[0]?.purpose ?? null;
    const recommended_use_fr = purposeFR?.[0]?.purpose ?? null;

    const { data: productData, error: productError } = await supabase
      .from("products")
      .upsert({
        npn: parseInt(npn),
        dose_amount: doseData?.quantity_dose ?? null,
        dose_unit: doseData?.uom_type_desc_quantity_dose ?? null,
        dose_freq_min: doseData?.frequency ?? null,
        dose_freq_unit: doseData?.uom_type_desc_frequency ?? null,
        dosage_form_type: dosageFormParts[0] || null,
        dosage_form_subtype: dosageFormParts[1] || null,
        date_of_licensing: primary.licence_date ?? null,
        licensing_status: "active",
        recommended_use,
        recommended_use_fr,
        dose_population: doseData?.population_type_desc ?? null,
        dose_min_age: doseData?.age_minimum ?? null,
        // Structured risk buckets
        ...riskFields,
        // Structured purposes
        purposes_en,
        purposes_fr,
      }, { onConflict: "npn" })
      .select("id")
      .single();

    if (productError) throw new Error("products upsert failed: " + productError.message);
    const product_id = productData.id;

    // Step 5: brands (delete + reinsert)
    const brandNames: string[] = [];
    await supabase.from("product_brands").delete().eq("product_id", product_id);
    for (const lic of licences) {
      brandNames.push(lic.product_name);
      await supabase.from("product_brands").insert({
        product_id,
        brand_name: lic.product_name,
        is_default: lic.flag_primary_name === 1,
      });
    }

    // Step 6: non-medicinal → excipients + product_excipients
    if (nonMedEN && nonMedEN.length > 0) {
      await supabase.from("product_excipients").delete().eq("product_id", product_id);

      for (const item of nonMedEN) {
        const frName = nonMedFR?.find((f: any) =>
          f.ingredient_name.toLowerCase() === item.ingredient_name.toLowerCase()
        )?.ingredient_name ?? null;

        const excAllergens = detectAllergens(item.ingredient_name ?? "");

        const { data: excData } = await supabase
          .from("excipients")
          .upsert({
            name: item.ingredient_name,
            name_fr: frName,        // Fixed: was name_zh
            allergen_types: excAllergens,
          }, { onConflict: "name" })
          .select("id")
          .single();

        if (excData) {
          await supabase
            .from("product_excipients")
            .upsert({ product_id, excipient_id: excData.id }, { onConflict: "product_id,excipient_id" });
        }
      }
    }

    // Step 7: product_labels removed in V2 — fields now live on products table
    // (already saved in step 4 upsert above)

    // Step 8: medicinal ingredients
    if (medicinalEN && medicinalEN.length > 0) {
      await supabase
        .from("product_ingredients")
        .delete()
        .eq("product_id", product_id);

      // Merge duplicate ingredients (mass + potency reported separately)
      const merged = mergeIngredients(medicinalEN);
      // Sort by mass content descending
      const sorted = merged.sort((a: any, b: any) =>
        toMcg(b.quantity, b.quantity_unit_of_measure) -
        toMcg(a.quantity, a.quantity_unit_of_measure)
      );

      for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i];
        const frItem = medicinalFR?.find((f: any) =>
          f.ingredient_name?.toLowerCase() === item.ingredient_name?.toLowerCase()
        );

        const ingAllergens = detectAllergens(
          item.ingredient_name ?? "",
          item.source_material ?? undefined,
        );

        // Find or create ingredient (V2: was common_ingredients)
        let ingredientId: number | null = null;
        let ingredientRecord: any = null;
        const { data: existing } = await supabase
          .from("ingredients")
          .select("id, source_organisms, name_en, name_fr, scientific_name")
          .eq("scientific_name", item.ingredient_name)
          .maybeSingle();

        if (existing) {
          ingredientId = existing.id;
          ingredientRecord = existing;
          // Only update name_en/name_fr if no NHPID common name exists yet
          // (NHPID provides proper common names; LNHPD only has scientific names)
          const updatePayload: Record<string, unknown> = { allergen_types: ingAllergens };
          if (!existing.name_en || existing.name_en === existing.scientific_name) {
            updatePayload.name_en = item.ingredient_name;
          }
          if (frItem?.ingredient_name && (!existing.name_fr || existing.name_fr === existing.scientific_name)) {
            updatePayload.name_fr = frItem.ingredient_name;
          }
          await supabase
            .from("ingredients")
            .update(updatePayload)
            .eq("id", ingredientId);
        } else {
          const { data: newIngredient } = await supabase
            .from("ingredients")
            .insert({
              scientific_name: item.ingredient_name,
              name_en: item.ingredient_name,
              name_fr: frItem?.ingredient_name ?? null,
              allergen_types: ingAllergens,
            })
            .select("id, source_organisms")
            .single();
          ingredientId = newIngredient?.id ?? null;
          ingredientRecord = newIngredient;
        }

        if (ingredientId) {
          // Extract ratio
          const ratioNum = item.ratio_numerator ?? null;
          const ratioDen = item.ratio_denominator ?? null;
          const extractRatio = ratioNum && ratioDen ? `${ratioNum}:${ratioDen}` : null;

          // Resolve source material + part
          let resolvedSourceMaterial = item.source_material ?? null;
          let resolvedSourcePart = item.source_material ? extractSourcePart(item.source_material) : null;

          // If NHPID source_organisms available, resolve full organism name
          const sourceOrganisms = ingredientRecord?.source_organisms;
          if (sourceOrganisms && resolvedSourcePart) {
            const organisms = sourceOrganisms as Array<{organism: string, part: string}>;
            const match = organisms.find((o: any) =>
              o.part?.toLowerCase() === resolvedSourcePart?.toLowerCase()
            );
            if (match) {
              resolvedSourceMaterial = `${match.organism} - ${match.part}`;
            }
          }

          const rawExtractType = item.extract_type_desc ?? '';

          await supabase
            .from("product_ingredients")
            .insert({
              product_id,
              ingredient_id: ingredientId,
              amount_value: item.quantity ? parseFloat(item.quantity) : null,
              amount_unit: normalizeUnit(item.quantity_unit_of_measure),
              extract_ratio: extractRatio,
              dried_herb_equivalent: item.dried_herb_equivalent ? parseFloat(item.dried_herb_equivalent) : null,
              dhe_unit: normalizeUnit(item.dhe_unit_of_measure),
              potency_amount: item.potency_amount ? parseFloat(item.potency_amount) : null,
              potency_label: normalizeUnit(item.potency_label) ?? item.potency_label ?? null,
              source_material: resolvedSourceMaterial,
              source_part: resolvedSourcePart,
              extract_type: rawExtractType !== '' ? rawExtractType : null,
              sort_order: i,
            });
        }
      }
    }

    return {
      npn,
      success: true,
      product_id,
      product_name: primary.product_name,
      brands: brandNames,
    };

  } catch (e) {
    return { npn, success: false, error: (e as Error).message };
  }
}
