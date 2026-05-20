-- Waitlist extra fields (Instagram + profession after email signup)
ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS instagram_profile text,
  ADD COLUMN IF NOT EXISTS profession text;

-- Creator onboarding / profile completion fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS social_platform text DEFAULT 'instagram',
  ADD COLUMN IF NOT EXISTS social_username text,
  ADD COLUMN IF NOT EXISTS height text,
  ADD COLUMN IF NOT EXISTS weight text,
  ADD COLUMN IF NOT EXISTS chest text,
  ADD COLUMN IF NOT EXISTS waist text,
  ADD COLUMN IF NOT EXISTS hips text,
  ADD COLUMN IF NOT EXISTS shoe_size text,
  ADD COLUMN IF NOT EXISTS min_license_fee_inr integer,
  ADD COLUMN IF NOT EXISTS voice_sample_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_video_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_license_signed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_submitted_at timestamptz;

-- Manual identity verification uploads (replaces Persona for team review)
CREATE TABLE IF NOT EXISTS identity_verification_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_kind text NOT NULL CHECK (file_kind IN (
    'liveness_front',
    'liveness_left',
    'liveness_right',
    'social_followers',
    'social_age',
    'social_location'
  )),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, file_kind)
);

CREATE INDEX IF NOT EXISTS idx_identity_verification_files_user
  ON identity_verification_files(user_id);

ALTER TABLE identity_verification_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own identity verification files"
  ON identity_verification_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own identity verification files"
  ON identity_verification_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own identity verification files"
  ON identity_verification_files FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Character photos for profile completion (separate from encrypted vault assets)
CREATE TABLE IF NOT EXISTS character_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_character_photos_user
  ON character_photos(user_id);

ALTER TABLE character_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own character photos"
  ON character_photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own character photos"
  ON character_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own character photos"
  ON character_photos FOR DELETE
  USING (auth.uid() = user_id);
