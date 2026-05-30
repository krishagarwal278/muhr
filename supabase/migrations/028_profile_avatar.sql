-- Profile photo (storage path under bucket `assets`, e.g. {user_id}/avatar/…)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_path text;

COMMENT ON COLUMN profiles.avatar_path IS 'Supabase storage path for the creator profile photo (bucket assets).';
