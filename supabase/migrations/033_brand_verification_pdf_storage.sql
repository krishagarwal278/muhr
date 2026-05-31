-- Brand verification documents upload PDFs to bucket `assets` under {user_id}/brand/verification/…
-- The assets bucket was image/audio/video only; add application/pdf without removing existing types.

UPDATE storage.buckets
SET allowed_mime_types = (
  SELECT array_agg(DISTINCT t)
  FROM unnest(COALESCE(allowed_mime_types, ARRAY[]::text[]) || ARRAY['application/pdf']::text[]) AS t
)
WHERE id = 'assets';
