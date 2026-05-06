-- Add missing caution (EN) column to labels
-- cautions_fr was added in 20260503 but the English counterpart was missed

ALTER TABLE labels ADD COLUMN IF NOT EXISTS caution text;
