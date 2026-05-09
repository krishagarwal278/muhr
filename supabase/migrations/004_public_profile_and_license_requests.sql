-- Public profile fields + license request stub (creator_id = profiles.id = auth.users.id)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS handle text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS accepting_requests boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_lower_key
  ON profiles (lower(trim(handle)))
  WHERE handle IS NOT NULL AND trim(handle) <> '';

-- Safe public read (does not expose kyc_status / kyc_verified_at)
CREATE OR REPLACE FUNCTION public.get_public_profile(p_handle text)
RETURNS TABLE (
  profile_id uuid,
  profile_handle text,
  profile_display_name text,
  profile_accepting_requests boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.handle,
    COALESCE(NULLIF(trim(p.display_name), ''), p.handle)::text,
    p.accepting_requests
  FROM profiles p
  WHERE p.handle IS NOT NULL
    AND trim(p.handle) <> ''
    AND lower(trim(p.handle)) = lower(trim(p_handle))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS license_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brand_email text NOT NULL,
  brand_name text NOT NULL,
  brand_company text,
  brand_website text,
  intended_use text NOT NULL,
  channels text[] NOT NULL DEFAULT '{}',
  territories text[] NOT NULL DEFAULT '{}',
  duration_days int NOT NULL DEFAULT 30,
  budget_inr int,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  decline_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  request_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex')
);

CREATE INDEX IF NOT EXISTS idx_license_requests_creator_status
  ON license_requests(creator_id, status);

CREATE INDEX IF NOT EXISTS idx_license_requests_token
  ON license_requests(request_token);

ALTER TABLE license_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators select own license requests"
  ON license_requests FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators update own license requests"
  ON license_requests FOR UPDATE
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);
