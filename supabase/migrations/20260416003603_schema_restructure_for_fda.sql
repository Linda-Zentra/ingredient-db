-- ============================================================
-- Schema restructure: support structured risk/purpose buckets,
-- NHPID metadata, extract/source fields, and allergens
-- ============================================================

-- 1A. product_labels: structured risk buckets + purposes
ALTER TABLE public.product_labels
  ADD COLUMN IF NOT EXISTS do_not_use_en        text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ask_before_use_en    text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS when_using_en        text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stop_use_en          text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS for_external_use_en  text,
  ADD COLUMN IF NOT EXISTS known_adverse_en     text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS other_warnings_en    text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS other_information_en text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS keep_out_overdose_en text,
  ADD COLUMN IF NOT EXISTS purposes_en          text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS purposes_fr          text[] DEFAULT '{}';

-- 1B. common_ingredients: NHPID metadata
ALTER TABLE public.common_ingredients
  ADD COLUMN IF NOT EXISTS nhpid_id         text UNIQUE,
  ADD COLUMN IF NOT EXISTS common_names_en  text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS common_names_fr  text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS proper_names     text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS category         text,
  ADD COLUMN IF NOT EXISTS cas_number       text,
  ADD COLUMN IF NOT EXISTS source_organisms jsonb  DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_medicinal     boolean,
  ADD COLUMN IF NOT EXISTS is_non_medicinal boolean,
  ADD COLUMN IF NOT EXISTS allergen_types   text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS monograph_refs   text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_common_ingredients_nhpid_id
  ON public.common_ingredients (nhpid_id);

-- 1C. product_medicinal_ingredients: extract/source fields
ALTER TABLE public.product_medicinal_ingredients
  ADD COLUMN IF NOT EXISTS extract_ratio         text,
  ADD COLUMN IF NOT EXISTS dried_herb_equivalent  numeric,
  ADD COLUMN IF NOT EXISTS dhe_unit               text,
  ADD COLUMN IF NOT EXISTS potency_amount         numeric,
  ADD COLUMN IF NOT EXISTS potency_label          text,
  ADD COLUMN IF NOT EXISTS source_material        text,
  ADD COLUMN IF NOT EXISTS source_part            text,
  ADD COLUMN IF NOT EXISTS extract_type           text,
  ADD COLUMN IF NOT EXISTS sort_order             integer DEFAULT 0;

-- 1D. excipients: allergens + French name
ALTER TABLE public.excipients
  ADD COLUMN IF NOT EXISTS allergen_types text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS name_fr        text;

-- Bug fix: import-npn stored French names in name_zh column
UPDATE public.excipients
  SET name_fr = name_zh
  WHERE name_zh IS NOT NULL AND name_fr IS NULL;

-- Backfill: copy caution from products to product_labels where missing
UPDATE public.product_labels pl
  SET caution = p.caution
  FROM public.products p
  WHERE pl.product_id = p.id
    AND (pl.caution IS NULL OR pl.caution = '')
    AND p.caution IS NOT NULL AND p.caution != '';
