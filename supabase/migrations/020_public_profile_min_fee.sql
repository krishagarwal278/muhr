-- Surface creator's stated minimum license fee on the public /k/:handle RPC so the brand-facing
-- fee recommendation engine can anchor its estimate on the creator's own floor (vs. defaulting
-- to a generic tier).
--
-- If you previously hit 42P13 ("cannot change return type"), this migration's DROP FUNCTION
-- below handles it; just run the file top to bottom.

DROP FUNCTION IF EXISTS public.get_public_profile(text);

CREATE FUNCTION public.get_public_profile(p_handle text)
RETURNS TABLE (
  profile_id uuid,
  profile_handle text,
  profile_display_name text,
  profile_accepting_requests boolean,
  profile_licensing_notes text,
  profile_min_license_fee_inr integer
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
    NULLIF(trim(p.licensing_notes), '')::text,
    p.min_license_fee_inr
  FROM profiles p
  WHERE p.handle IS NOT NULL
    AND trim(p.handle) <> ''
    AND lower(trim(p.handle)) = lower(trim(p_handle))
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_public_profile(text) IS
  'Public creator card fields for /k/:handle (no auth). Includes minimum licensing fee so brand-side fee recommendations can anchor on the creator''s own floor.';

REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated, service_role;
