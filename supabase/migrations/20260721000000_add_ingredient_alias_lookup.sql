-- Resolve harmless notation differences between LNHPD medicinal names and
-- the curated NHPID dictionary, while preferring rows with NHPID provenance.
CREATE OR REPLACE FUNCTION public.normalize_ingredient_alias(raw_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT regexp_replace(
    regexp_replace(
      lower(coalesce(raw_value, '')),
      '\(([0-9]*)([rs])\)',
      E'\\2',
      'g'
    ),
    '[^a-z0-9]+',
    '',
    'g'
  );
$$;

CREATE OR REPLACE FUNCTION public.find_ingredient_by_alias(raw_name text)
RETURNS TABLE (
  id bigint,
  nhpid_id text,
  scientific_name text,
  name_en text,
  name_fr text,
  common_names_en text[],
  common_names_fr text[],
  proper_names text[],
  source_organisms jsonb,
  allergen_types text[]
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH needle AS (
    SELECT public.normalize_ingredient_alias(raw_name) AS alias_key
  ), candidates AS (
    SELECT
      ingredient.*,
      CASE
        WHEN lower(ingredient.scientific_name) = lower(raw_name) THEN 0
        WHEN lower(coalesce(ingredient.name_en, '')) = lower(raw_name) THEN 1
        ELSE 2
      END AS match_rank
    FROM public.ingredients AS ingredient
    CROSS JOIN needle
    WHERE needle.alias_key <> ''
      AND (
        public.normalize_ingredient_alias(ingredient.scientific_name) = needle.alias_key
        OR public.normalize_ingredient_alias(ingredient.name_en) = needle.alias_key
        OR public.normalize_ingredient_alias(ingredient.name_fr) = needle.alias_key
        OR EXISTS (
          SELECT 1
          FROM unnest(coalesce(ingredient.common_names_en, '{}'::text[])) AS alias(value)
          WHERE public.normalize_ingredient_alias(alias.value) = needle.alias_key
        )
        OR EXISTS (
          SELECT 1
          FROM unnest(coalesce(ingredient.common_names_fr, '{}'::text[])) AS alias(value)
          WHERE public.normalize_ingredient_alias(alias.value) = needle.alias_key
        )
        OR EXISTS (
          SELECT 1
          FROM unnest(coalesce(ingredient.proper_names, '{}'::text[])) AS alias(value)
          WHERE public.normalize_ingredient_alias(alias.value) = needle.alias_key
        )
      )
  )
  SELECT
    candidates.id,
    candidates.nhpid_id,
    candidates.scientific_name,
    candidates.name_en,
    candidates.name_fr,
    candidates.common_names_en,
    candidates.common_names_fr,
    candidates.proper_names,
    candidates.source_organisms,
    candidates.allergen_types
  FROM candidates
  ORDER BY
    (candidates.nhpid_id IS NULL),
    candidates.match_rank,
    candidates.id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.normalize_ingredient_alias(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_ingredient_by_alias(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_ingredient_alias(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_ingredient_by_alias(text) TO authenticated, service_role;

COMMENT ON FUNCTION public.find_ingredient_by_alias(text) IS
  'Maps an LNHPD medicinal name to the best curated NHPID ingredient row using a normalized alias comparison.';
