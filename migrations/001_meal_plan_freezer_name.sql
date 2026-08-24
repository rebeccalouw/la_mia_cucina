-- 001: store the name of a consumed freezer meal on the plan itself.
--
-- Planning a freezer meal removes the item from the freezer, so meal_plans.freezer_item_id
-- could not reliably hold a valid reference; the current code wrote NULL and prepended the
-- item's name to `notes` instead, which made a freezer meal indistinguishable from a plain
-- note. This column records it properly.
--
-- Idempotent — safe to re-run.
--   psql "$DATABASE_URL" -f migrations/001_meal_plan_freezer_name.sql

ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS freezer_item_name TEXT;

-- Backfill the rows written by an older version of the code that did populate freezer_item_id.
-- These names are exact (resolved through the foreign key), not inferred. Because the FK is
-- ON DELETE CASCADE, any surviving plan still has its freezer_items row to read from.
UPDATE meal_plans mp
SET freezer_item_name = fi.name
FROM freezer_items fi
WHERE mp.freezer_item_id = fi.id
  AND mp.freezer_item_name IS NULL;

-- Plans whose freezer meal name was smuggled into `notes` are deliberately NOT backfilled:
-- a plain note and a smuggled name cannot be told apart, so guessing would corrupt real notes.
-- Those rows keep rendering from `notes`, exactly as they do today.

-- Optional cleanup of the dead foreign key, once nothing reads it any more. Confirm every
-- linked row carried its name across first, then run the DROP by hand:
--
--   SELECT count(*) FROM meal_plans WHERE freezer_item_id IS NOT NULL AND freezer_item_name IS NULL;
--   -- expect 0
--   ALTER TABLE meal_plans DROP COLUMN IF EXISTS freezer_item_id;
