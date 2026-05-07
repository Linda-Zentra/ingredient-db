-- Brand name on SKU (supplier's proprietary name, e.g. "Quali-B®")
ALTER TABLE skus ADD COLUMN IF NOT EXISTS brand_name text;

-- Chemical forms / sub-ingredients within a SKU
-- e.g. Quali-B® Vitamin B6 (77mg) contains:
--   pyridoxine hydrochloride 25mg
--   pyridoxal-5-phosphate    52mg
CREATE TABLE sku_forms (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku_id     bigint NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
  name_en    text NOT NULL,
  name_fr    text,
  amount     numeric,
  unit       text,
  sort_order integer DEFAULT 0
);

CREATE INDEX idx_sku_forms_sku_id ON sku_forms (sku_id);
