// ============================================================
// 密码
// ============================================================
export const PASSWORDS = {
  internal: "ingredient2026",
  operations: "operations2026",
};

// ============================================================
// SKU 字段定义 — DetailPanel 编辑 + AddForm 用
// ============================================================
export const SKU_FIELDS = [
  { key: "region",                   label: "地区" },
  { key: "ingredient_name",         label: "品名" },
  { key: "form_potency",            label: "Form & Potency" },
  { key: "ingredient",              label: "成分" },
  { key: "extraction_ratio_source", label: "提取比例/来源" },
  { key: "lead_time",               label: "交付周期" },
  { key: "expire_date",             label: "Expire Date" },
  { key: "price_usd_kg",            label: "价格(USD/KG)" },
  { key: "price_cad_kg",            label: "价格(CAD/KG)" },
  { key: "daily_recommended_dose",  label: "日推荐摄入量" },
  { key: "health_canada_monograph", label: "HC Monograph" },
  { key: "moq_kg",                  label: "MOQ kg" },
  { key: "can_apply_npn",           label: "能否申NPN" },
  { key: "npn_notes",               label: "NPN备注" },
  { key: "applicable_gender",       label: "适用性别" },
  { key: "applicable_population",   label: "适用人群" },
  { key: "notes",                   label: "备注" },
  { key: "certificates",            label: "Certificates" },
];

// ============================================================
// 原料库表格列定义
// ============================================================
export const TABLE_COLS = [
  { key: "region",                   label: "地区",         w: 90 },
  { key: "supplier_name",           label: "供应商",        w: 130 },
  { key: "contact_email",           label: "联系人",        w: 130 },
  { key: "is_account_opened",       label: "是否开户",      w: 80 },
  { key: "agreement_signed",        label: "Agreement",    w: 110 },
  { key: "ingredient_name",         label: "品名",         w: 150 },
  { key: "form_potency",            label: "Form & Potency", w: 130 },
  { key: "ingredient",              label: "成分",         w: 150 },
  { key: "extraction_ratio_source", label: "提取比例/来源",  w: 120 },
  { key: "lead_time",               label: "交付周期",      w: 100 },
  { key: "expire_date",             label: "Expire",       w: 90 },
  { key: "price_usd_kg",            label: "USD/KG",       w: 110 },
  { key: "price_cad_kg",            label: "CAD/KG",       w: 100 },
  { key: "daily_recommended_dose",  label: "日推荐摄入量",   w: 100 },
  { key: "health_canada_monograph", label: "HC Monograph",  w: 110 },
  { key: "moq_kg",                  label: "MOQ",          w: 70 },
  { key: "functions",               label: "功能",         w: 180 },
  { key: "can_apply_npn",           label: "NPN",          w: 60 },
  { key: "npn_notes",               label: "NPN备注",      w: 120 },
  { key: "applicable_gender",       label: "性别",         w: 50 },
  { key: "applicable_population",   label: "人群",         w: 60 },
  { key: "notes",                   label: "备注",         w: 120 },
  { key: "certificates",            label: "Certificates",  w: 120 },
];

// ============================================================
// 状态配置
// ============================================================
export const STATUS_CONFIG = {
  licensing: {
    not_started: { label: "未申请", color: "#94a3b8" },
    pending:     { label: "Pending", color: "#f59e0b" },
    active:      { label: "Active",  color: "#22c55e" },
    expired:     { label: "Expired", color: "#ef4444" },
  },
};

// ============================================================
// 标签编辑 — section 定义
// ============================================================
export const SECTION_DEFS = [
  { key: "product_name",        label: "1. 产品名称",                 source: "computed" },
  { key: "subtitle",            label: "2. 副标题 / 功能声明",         source: "label" },
  { key: "spec",                label: "3. 规格 & NPN",               source: "computed" },
  { key: "recommended_use",     label: "4. Recommended Use",          source: "product", field: "recommended_use" },
  { key: "recommended_use_fr",  label: "4b. Utilisation Recommandée", source: "label", fr: true },
  { key: "recommended_dose",    label: "5. Recommended Dose",         source: "computed" },
  { key: "recommended_dose_fr", label: "5b. Dose Recommandée",        source: "label", fr: true },
  { key: "cautions",            label: "6. Cautions & Warnings",      source: "product", field: "caution" },
  { key: "cautions_fr",         label: "6b. Mises en garde",          source: "label", fr: true },
  { key: "medicinal_en",        label: "7. Medicinal Ingredients",    source: "computed" },
  { key: "medicinal_fr",        label: "7b. Ingrédients Médicinaux",  source: "label", fr: true },
  { key: "non_medicinal",       label: "8. Non-Medicinal",            source: "computed" },
  { key: "non_medicinal_fr",    label: "8b. Ingrédients Non Médicinaux", source: "label", fr: true },
  { key: "risk_info",           label: "9. Risk Information",         source: "label" },
  { key: "risk_info_fr",        label: "9b. Renseignements Risques",  source: "label", fr: true },
  { key: "company_info",        label: "10. 公司信息",                 source: "label" },
  { key: "licence_holder",      label: "10b. Licence Holder",         source: "label" },
  { key: "sidebar_text",        label: "11. 侧边文字 / 卖点",         source: "label" },
];
// ============================================================
// 标签默认值
// ============================================================
export const DEFAULT_COMPANY = `Distributor / Distributeur\nNutrizen Station Lab Inc.\nRichmond, BC, Canada\ninfo@zentrastation.com`;

export const DEFAULT_RISK = "KEEP OUT OF REACH OF CHILDREN. DO NOT USE IF SEAL UNDER CAP IS BROKEN. STORE IN A COOL, DARK AND DRY PLACE.";

export const DEFAULT_RISK_FR = "GARDER HORS DE LA PORTÉE DES ENFANTS. NE PAS UTILISER SI LE SCEAU SOUS LE BOUCHON EST BRISÉ. CONSERVER DANS UN ENDROIT FRAIS, SOMBRE ET SEC.";

// ============================================================
// 预设颜色（分类管理用）
// ============================================================
export const PRESET_COLORS = [
  "#dc2626", "#ea580c", "#d97706", "#65a30d", "#059669", "#0891b2",
  "#2563eb", "#6366f1", "#8b5cf6", "#7c3aed", "#ec4899", "#db2777",
  "#be123c", "#ca8a04", "#0d9488", "#16a34a", "#f59e0b", "#6d28d9",
  "#0ea5e9", "#14b8a6", "#475569", "#64748b", "#a3a3a3",
];
