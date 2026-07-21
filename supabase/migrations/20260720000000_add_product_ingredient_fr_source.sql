-- Preserve product-specific French medicinal source metadata returned by LNHPD.
-- Existing rows remain valid; missing translations are surfaced by export QA.
ALTER TABLE public.product_ingredients
  ADD COLUMN IF NOT EXISTS source_material_fr text,
  ADD COLUMN IF NOT EXISTS source_part_fr     text,
  ADD COLUMN IF NOT EXISTS extract_type_fr   text;

COMMENT ON COLUMN public.product_ingredients.source_material_fr IS
  'Official product-specific French source material from the Health Canada LNHPD response.';
COMMENT ON COLUMN public.product_ingredients.source_part_fr IS
  'French source part derived from the official French source_material value.';
COMMENT ON COLUMN public.product_ingredients.extract_type_fr IS
  'Official product-specific French extract type from the Health Canada LNHPD response.';
