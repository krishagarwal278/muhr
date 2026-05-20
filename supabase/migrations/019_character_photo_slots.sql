-- Fixed slots (0–6) so deleted photos can be re-added in the same thumbnail position

ALTER TABLE character_photos
  ADD COLUMN IF NOT EXISTS slot_index smallint;

WITH numbered AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY user_id ORDER BY created_at ASC) - 1 AS idx
  FROM character_photos
  WHERE slot_index IS NULL
)
UPDATE character_photos cp
SET slot_index = LEAST(n.idx, 6)
FROM numbered n
WHERE cp.id = n.id;

CREATE UNIQUE INDEX IF NOT EXISTS character_photos_user_slot_unique
  ON character_photos (user_id, slot_index);
