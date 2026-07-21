ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_lines text[] DEFAULT '{}';
