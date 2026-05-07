-- Replace public write policies with authenticated-only write
-- Read policies already exist from 20260503000001_rls_public_read.sql

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'ingredients', 'excipients', 'suppliers', 'function_categories',
    'skus', 'sku_functions', 'brands', 'products',
    'product_ingredients', 'product_excipients', 'product_brands',
    'images', 'product_images', 'ingredient_images', 'logos', 'labels'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public write %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Auth insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (true)', t
    );
    EXECUTE format(
      'CREATE POLICY "Auth update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t
    );
    EXECUTE format(
      'CREATE POLICY "Auth delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (true)', t
    );
  END LOOP;
END $$;
