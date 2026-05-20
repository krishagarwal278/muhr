-- Superseded by screenshot uploads in identity_verification_files (see 017_drop_profile_social_text_stats.sql).
-- Social audience stats as text (replaces screenshot uploads for lower friction)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS social_follower_count text,
  ADD COLUMN IF NOT EXISTS social_follower_age text,
  ADD COLUMN IF NOT EXISTS social_follower_location text;
