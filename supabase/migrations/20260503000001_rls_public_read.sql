-- Enable RLS and add public read policies for all tables
-- Internal tool: allow all authenticated + anon reads

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
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "Public read %1$s" ON public.%1$I FOR SELECT USING (true)',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Public write %1$s" ON public.%1$I FOR ALL USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;
