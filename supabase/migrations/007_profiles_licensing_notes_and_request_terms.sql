-- If you previously hit 42P13 ("cannot change return type"), run this whole file from the top:
-- `DROP FUNCTION` below is required before changing RETURNS TABLE columns.

-- Optional public-facing notes brands see before requesting a license.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS licensing_notes text;

COMMENT ON COLUMN profiles.licensing_notes IS 'Optional text shown on public /k/:handle page before brands submit a license request.';

-- Audit trail: brand confirmed Muhr terms before submit (server-enforced).
ALTER TABLE license_requests
  ADD COLUMN IF NOT EXISTS brand_accepted_muhr_terms boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN license_requests.brand_accepted_muhr_terms IS 'True when brand checked Muhr T&Cs acknowledgement on the public request form.';

-- Postgres cannot change RETURNS TABLE columns with CREATE OR REPLACE alone.
DROP FUNCTION IF EXISTS public.get_public_profile(text);

CREATE FUNCTION public.get_public_profile(p_handle text)
RETURNS TABLE (
  profile_id uuid,
  profile_handle text,
  profile_display_name text,
  profile_accepting_requests boolean,
  profile_licensing_notes text
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
    p.accepting_requests,
    NULLIF(trim(p.licensing_notes), '')::text
  FROM profiles p
  WHERE p.handle IS NOT NULL
    AND trim(p.handle) <> ''
    AND lower(trim(p.handle)) = lower(trim(p_handle))
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_public_profile(text) IS 'Public creator card fields for /k/:handle (no auth).';

REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated, service_role;
