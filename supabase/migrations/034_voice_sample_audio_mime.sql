-- Voice samples (MP3 / MP4) for vault licensing recordings and uploads.

UPDATE storage.buckets
SET allowed_mime_types = (
  SELECT array_agg(DISTINCT t)
  FROM unnest(
    COALESCE(allowed_mime_types, ARRAY[]::text[])
      || ARRAY['audio/mpeg', 'audio/mp4', 'application/octet-stream']::text[]
  ) AS t
)
WHERE id = 'assets';
