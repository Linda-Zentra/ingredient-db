-- ══════════════════════════════════════════════════════════════
-- V2 Full Restructure
-- Merges ingredient-db + labelgen into a unified clean schema.
-- Run AFTER exporting a snapshot of the current data.
-- ══════════════════════════════════════════════════════════════

-- ── Drop ALL old tables (reverse dependency order) ──────────

DROP TABLE IF EXISTS sku_functions                CASCADE;
DROP TABLE IF EXISTS product_labels               CASCADE;
DROP TABLE IF EXISTS product_medicinal_ingredients CASCADE;
DROP TABLE IF EXISTS product_ingredients          CASCADE;  -- old SKU link table
DROP TABLE IF EXISTS product_excipients           CASCADE;
DROP TABLE IF EXISTS product_brands               CASCADE;
DROP TABLE IF EXISTS skus                         CASCADE;
DROP TABLE IF EXISTS common_ingredients           CASCADE;
DROP TABLE IF EXISTS excipients                   CASCADE;
DROP TABLE IF EXISTS products                     CASCADE;
DROP TABLE IF EXISTS function_categories          CASCADE;
DROP TABLE IF EXISTS suppliers                    CASCADE;
DROP TABLE IF EXISTS labels                       CASCADE;
DROP TABLE IF EXISTS logos                        CASCADE;
DROP TABLE IF EXISTS images                       CASCADE;
DROP TABLE IF EXISTS product_images               CASCADE;
DROP TABLE IF EXISTS ingredient_images            CASCADE;
DROP TABLE IF EXISTS brands                       CASCADE;

-- ══════════════════════════════════════════════════════════════
-- 1. ingredients  (was common_ingredients, ~18K from clean data)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE ingredients (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nhpid_id         text UNIQUE,
  scientific_name  text NOT NULL UNIQUE,
  name_en          text,
  name_fr          text,
  common_names_en  text[] DEFAULT '{}',
  common_names_fr  text[] DEFAULT '{}',
  proper_names     text[] DEFAULT '{}',
  category         text,
  cas_number       text,
  source_organisms jsonb  DEFAULT '[]',
  is_medicinal     boolean,
  is_non_medicinal boolean,
  allergen_types   text[] DEFAULT '{}'
);

CREATE INDEX idx_ingredients_nhpid ON ingredients (nhpid_id);

-- ══════════════════════════════════════════════════════════════
-- 2. excipients
-- ══════════════════════════════════════════════════════════════
CREATE TABLE excipients (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name           text NOT NULL UNIQUE,
  name_fr        text,
  allergen_types text[] DEFAULT '{}'
);

-- ══════════════════════════════════════════════════════════════
-- 3. suppliers
-- ══════════════════════════════════════════════════════════════
CREATE TABLE suppliers (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_name    text NOT NULL,
  contact_email    text,
  is_account_opened text,
  agreement_signed  text
);

-- ══════════════════════════════════════════════════════════════
-- 4. function_categories  (ingredient tagging)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE function_categories (
  id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name_zh  text,
  name_en  text,
  color    text
);

-- ══════════════════════════════════════════════════════════════
-- 5. skus  (raw material sourcing)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE skus (
  id                       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_id              bigint REFERENCES suppliers(id) ON DELETE CASCADE,
  ingredient_id            bigint REFERENCES ingredients(id),
  ingredient_name          text,
  region                   text,
  form_potency             text,
  ingredient               text,
  extraction_ratio_source  text,
  lead_time                text,
  expire_date              text,
  price_usd_kg             text,
  price_cad_kg             text,
  daily_recommended_dose   text,
  health_canada_monograph  text,
  moq_kg                   text,
  can_apply_npn            text,
  npn_notes                text,
  applicable_gender        text,
  applicable_population    text,
  authorization_claims     text,
  notes                    text,
  certificates             text
);

-- ══════════════════════════════════════════════════════════════
-- 6. sku_functions  (sku ↔ function_category junction)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE sku_functions (
  sku_id      bigint NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
  category_id bigint NOT NULL REFERENCES function_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (sku_id, category_id)
);

-- ══════════════════════════════════════════════════════════════
-- 7. brands  (product lines: Zentra, Zensta, ...)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE brands (
  id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name     text NOT NULL UNIQUE,
  logo_url text,
  color    text
);

-- ══════════════════════════════════════════════════════════════
-- 8. products
-- ══════════════════════════════════════════════════════════════
CREATE TABLE products (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  npn                  text UNIQUE,
  lnhpd_id             text,
  product_name         text,
  product_name_zh      text,
  company_name         text,

  -- dosage & dose
  dosage_form_type     text,
  dosage_form_subtype  text,
  dose_amount          numeric,
  dose_amount_max      numeric,
  dose_unit            text,
  dose_freq_min        integer,
  dose_freq_max        integer,
  dose_freq_unit       text,
  dose_population      text,
  dose_min_age         integer,

  -- purposes (bilingual)
  purposes_en          text[] DEFAULT '{}',
  purposes_fr          text[] DEFAULT '{}',
  recommended_use      text,
  recommended_use_fr   text,

  -- structured warnings (bilingual)
  for_external_use_en  text,
  for_external_use_fr  text,
  do_not_use_en        text[] DEFAULT '{}',
  do_not_use_fr        text[] DEFAULT '{}',
  ask_before_use_en    text[] DEFAULT '{}',
  ask_before_use_fr    text[] DEFAULT '{}',
  when_using_en        text[] DEFAULT '{}',
  when_using_fr        text[] DEFAULT '{}',
  stop_use_en          text[] DEFAULT '{}',
  stop_use_fr          text[] DEFAULT '{}',
  keep_out_overdose_en text,
  keep_out_overdose_fr text,
  other_warnings_en    text[] DEFAULT '{}',
  other_warnings_fr    text[] DEFAULT '{}',
  known_adverse_en     text[] DEFAULT '{}',
  known_adverse_fr     text[] DEFAULT '{}',
  other_information_en text[] DEFAULT '{}',
  other_information_fr text[] DEFAULT '{}',

  -- internal management
  licensing_status     text DEFAULT 'not_started',
  is_marketed          boolean DEFAULT false,
  price_cad            numeric,
  price_usd            numeric,
  notes                text,

  created_at           timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- 9. product_ingredients  (many-to-many bridge)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE product_ingredients (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id         bigint  NOT NULL REFERENCES ingredients(id),
  sku_id                bigint  REFERENCES skus(id),
  amount_value          numeric,
  amount_unit           text,
  extract_ratio         text,
  extract_type          text,
  dried_herb_equivalent numeric,
  dhe_unit              text,
  potency_amount        numeric,
  potency_label         text,
  source_material       text,
  source_part           text,
  sort_order            integer DEFAULT 0
);

-- ══════════════════════════════════════════════════════════════
-- 10. product_excipients  (junction)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE product_excipients (
  product_id   uuid   NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  excipient_id bigint NOT NULL REFERENCES excipients(id),
  PRIMARY KEY (product_id, excipient_id)
);

-- ══════════════════════════════════════════════════════════════
-- 11. product_brands  (multiple brand names per product)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE product_brands (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id uuid   NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  brand_id   bigint REFERENCES brands(id),
  brand_name text   NOT NULL,
  is_default boolean DEFAULT false
);

-- ══════════════════════════════════════════════════════════════
-- 12. images  (shared image pool)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url        text NOT NULL,
  filename   text,
  type       text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- 13. product_images  (product ↔ image junction)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE product_images (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_id   uuid NOT NULL REFERENCES images(id)   ON DELETE CASCADE,
  PRIMARY KEY (product_id, image_id)
);

-- ══════════════════════════════════════════════════════════════
-- 14. ingredient_images  (ingredient ↔ image junction)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE ingredient_images (
  ingredient_id bigint NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  image_id      uuid   NOT NULL REFERENCES images(id)      ON DELETE CASCADE,
  PRIMARY KEY (ingredient_id, image_id)
);

-- ══════════════════════════════════════════════════════════════
-- 15. logos  (brand-line logos, used by label renderer)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE logos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   bigint REFERENCES brands(id),
  name       text,
  url        text NOT NULL,
  filename   text,
  created_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- 16. labels  (from labelgen, per-product label design)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE labels (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid   REFERENCES products(id) ON DELETE CASCADE,
  brand_id              bigint REFERENCES brands(id),
  logo_id               uuid   REFERENCES logos(id),

  template              text DEFAULT 'md',
  pdp_config            jsonb,
  product_name_override text,
  net_quantity          numeric,
  canvas_width_mm       numeric,
  canvas_height_mm      numeric,

  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- Storage buckets
-- ══════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images', 'product-images', true, 5242880,
   ARRAY['image/jpeg','image/png','image/webp']),
  ('logos', 'logos', true, 5242880,
   ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "Auth upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Auth delete product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Public read logos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'logos');

CREATE POLICY "Auth upload logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Auth delete logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'logos');
