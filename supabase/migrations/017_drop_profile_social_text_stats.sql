-- Screenshots live in identity_verification_files + storage bucket `assets`
-- (file_kind: social_followers, social_age, social_location). These text columns were
-- never wired up in the app and are misleading in the dashboard.
ALTER TABLE profiles
  DROP COLUMN IF EXISTS social_follower_count,
  DROP COLUMN IF EXISTS social_follower_age,
  DROP COLUMN IF EXISTS social_follower_location;
