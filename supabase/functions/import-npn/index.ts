import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const HC_BASE = "https://health-products.canada.ca/api/natural-licences";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchHC(endpoint: string, id: string, lang = "en") {
  const url = `${HC_BASE}/${endpoint}/?id=${id}&lang=${lang}&type=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? json;
}

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

    const supabase = createClient(
      SUPABASE_URL,
      Deno.env.get("SERVICE_KEY") ?? ""
    );

    const results = await Promise.all(npns.map(npn => importOne(String(npn), supabase)));

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
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

    // Step 2: 并行拉所有数据（EN + FR）
    const [
      purposeEN, purposeFR,
      riskEN, riskFR,
      dose,
      medicinalEN, medicinalFR,
      nonMedEN, nonMedFR,
    ] = await Promise.all([
      fetchHC("productpurpose", lnhpd_id, "en"),
      fetchHC("productpurpose", lnhpd_id, "fr"),
      fetchHC("productrisk", lnhpd_id, "en"),
      fetchHC("productrisk", lnhpd_id, "fr"),
      fetchHC("productdose", lnhpd_id, "en"),
      fetchHC("medicinalingredient", lnhpd_id, "en"),
      fetchHC("medicinalingredient", lnhpd_id, "fr"),
      fetchHC("nonmedicinalingredient", lnhpd_id, "en"),
      fetchHC("nonmedicinalingredient", lnhpd_id, "fr"),
    ]);

    // Step 3: 整理数据
    const doseData = dose?.[0] ?? null;

    // dosage_form_type / subtype 清洗："Capsule, Hard" → type="Capsule", subtype="Hard"
    const rawDosageForm = primary.dosage_form ?? null;
    const dosageFormParts = rawDosageForm ? rawDosageForm.split(",").map((s: string) => s.trim()) : [];
    const dosage_form_type    = dosageFormParts[0] ?? null;
    const dosage_form_subtype = dosageFormParts[1] ?? null;

    // Step 4: upsert products（不含已迁移到 product_labels 的字段）
    const { data: productData, error: productError } = await supabase
      .from("products")
      .upsert({
        npn: parseInt(npn),
        dose_amount: doseData?.quantity_dose ?? null,
        dose_unit: doseData?.uom_type_desc_quantity_dose ?? null,
        dose_freq_min: doseData?.frequency ?? null,
        dose_freq_unit: doseData?.uom_type_desc_frequency ?? null,
        dosage_form_type,
        dosage_form_subtype,
        date_of_licensing: primary.licence_date ?? null,
        licensing_status: "active",
      }, { onConflict: "npn" })
      .select("id")
      .single();

    if (productError) throw new Error("products upsert failed: " + productError.message);
    const product_id = productData.id;

    // Step 5: 处理品牌名（全删再重插）
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

    // Step 6: 处理 non-medicinal（excipients）
    if (nonMedEN && nonMedEN.length > 0) {
      await supabase.from("product_excipients").delete().eq("product_id", product_id);

      for (const item of nonMedEN) {
        const frName = nonMedFR?.find((f: any) =>
          f.ingredient_name.toLowerCase() === item.ingredient_name.toLowerCase()
        )?.ingredient_name ?? null;

        const { data: excData } = await supabase
          .from("excipients")
          .upsert({ name: item.ingredient_name, name_zh: frName }, { onConflict: "name" })
          .select("id")
          .single();

        if (excData) {
          await supabase
            .from("product_excipients")
            .upsert({ product_id, excipient_id: excData.id }, { onConflict: "product_id,excipient_id" });
        }
      }
    }

    // Step 7: upsert product_labels（含从 products 迁移过来的字段）
    const recommended_use = purposeEN?.[0]?.purpose ?? null;
    const recommended_use_fr = purposeFR?.[0]?.purpose ?? null;
    const caution = riskEN && riskEN.length > 0
      ? riskEN.map((r: any) => `${r.risk_type_desc}: ${r.risk_text}`).join("\n\n")
      : null;
    const cautions_fr = riskFR && riskFR.length > 0
      ? riskFR.map((r: any) => `${r.risk_type_desc}: ${r.risk_text}`).join("\n\n")
      : null;
    const nonMedFRText = nonMedFR?.map((f: any) => f.ingredient_name).join(", ") ?? null;

    const labelPayload = {
      recommended_use,
      recommended_use_fr,
      caution,
      cautions_fr,
      dose_population: doseData?.population_type_desc ?? null,
      dose_min_age: doseData?.age_minimum ?? null,
      non_medicinal_fr: nonMedFRText,
    };
    const { data: existingLabel } = await supabase
      .from("product_labels").select("id").eq("product_id", product_id).maybeSingle();
    if (existingLabel) {
      await supabase.from("product_labels").update(labelPayload).eq("id", existingLabel.id);
    } else {
      await supabase.from("product_labels").insert({ product_id, ...labelPayload });
    }

    // Step 8: 处理 medicinal ingredients
    if (medicinalEN && medicinalEN.length > 0) {
      await supabase
        .from("product_medicinal_ingredients")
        .delete()
        .eq("product_id", product_id);

      for (const item of medicinalEN) {
        const frItem = medicinalFR?.find((f: any) =>
          f.ingredient_name.toLowerCase() === item.ingredient_name.toLowerCase()
        );

        // 查找或创建 common_ingredient（以 scientific_name 为唯一键）
        let commonId: number | null = null;
        const { data: existing } = await supabase
          .from("common_ingredients")
          .select("id")
          .eq("scientific_name", item.ingredient_name)
          .maybeSingle();

        if (existing) {
          commonId = existing.id;
          // 补全缺失的多语言名称
          await supabase
            .from("common_ingredients")
            .update({
              name_en: item.ingredient_name,
              name_fr: frItem?.ingredient_name ?? null,
            })
            .eq("id", commonId);
        } else {
          const { data: newCommon } = await supabase
            .from("common_ingredients")
            .insert({
              scientific_name: item.ingredient_name,
              name_en: item.ingredient_name,
              name_fr: frItem?.ingredient_name ?? null,
            })
            .select("id")
            .single();
          commonId = newCommon?.id ?? null;
        }

        if (commonId) {
          await supabase
            .from("product_medicinal_ingredients")
            .insert({
              product_id,
              common_ingredient_id: commonId,
              amount_value: item.quantity ? parseFloat(item.quantity) : null,
              amount_unit: item.quantity_unit_of_measure ?? null,
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
    return { npn, success: false, error: e.message };
  }
}
