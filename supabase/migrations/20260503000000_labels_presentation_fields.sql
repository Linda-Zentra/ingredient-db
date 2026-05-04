-- Add label-presentation fields that were on product_labels
-- These are per-label design choices, not product data

ALTER TABLE labels
  ADD COLUMN IF NOT EXISTS label_type         text DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS subtitle           text,
  ADD COLUMN IF NOT EXISTS company_info       text,
  ADD COLUMN IF NOT EXISTS licence_holder     text,
  ADD COLUMN IF NOT EXISTS risk_info          text,
  ADD COLUMN IF NOT EXISTS risk_info_fr       text,
  ADD COLUMN IF NOT EXISTS cautions_fr        text,
  ADD COLUMN IF NOT EXISTS recommended_dose_fr text,
  ADD COLUMN IF NOT EXISTS medicinal_fr       text,
  ADD COLUMN IF NOT EXISTS non_medicinal_fr   text,
  ADD COLUMN IF NOT EXISTS side_bar           text;
