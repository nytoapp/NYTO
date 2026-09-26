-- Admin place management. Extends the existing place subject; no per-category tables.

ALTER TABLE places
  ADD COLUMN attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN price_amount_minor integer,
  ADD COLUMN price_currency char(3) REFERENCES currency_codes (code),
  ADD COLUMN price_basis text;

ALTER TABLE places
  ADD CONSTRAINT places_price_complete CHECK (
    (price_amount_minor IS NULL AND price_currency IS NULL AND price_basis IS NULL)
    OR (
      price_amount_minor IS NOT NULL
      AND price_amount_minor >= 0
      AND price_currency IS NOT NULL
      AND price_basis IN ('per_person', 'per_night', 'total')
    )
  );

CREATE TABLE subject_media (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  subject_id uuid NOT NULL REFERENCES catalog_subjects (id),
  position integer NOT NULL CHECK (position >= 0),
  alt text,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (subject_id, position)
);

CREATE INDEX catalog_places_recent_idx
  ON catalog_subjects (created_at DESC, id DESC)
  WHERE kind = 'place' AND deleted_at IS NULL;

CREATE INDEX subject_categories_category_idx ON subject_categories (category_id);

CREATE INDEX subject_translations_name_trgm ON subject_translations USING gin (name gin_trgm_ops);

CREATE INDEX places_locality_trgm ON places USING gin (locality gin_trgm_ops);

CREATE INDEX catalog_places_status_recent_idx
  ON catalog_subjects (status, created_at DESC, id DESC)
  WHERE kind = 'place' AND deleted_at IS NULL;

INSERT INTO providers (code, display_name, status, storage_policy)
VALUES ('catalog', 'Catalog', 'active', 'licensed_store')
ON CONFLICT (code) DO NOTHING;

UPDATE categories
SET parent_id = '018f5c3a-7c3a-7000-8000-0000000000d1'
WHERE id = '018f5c3a-7c3a-7000-8000-0000000000d2'
  AND parent_id IS NULL;
