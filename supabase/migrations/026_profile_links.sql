ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_links jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.profile_links IS
  'Public creator links: [{"platform":"instagram","value":"..."}, ...]';

UPDATE public.profiles
SET profile_links = '[]'::jsonb
WHERE jsonb_typeof(profile_links) IS DISTINCT FROM 'array';

UPDATE public.profiles p
SET profile_links = p.profile_links || jsonb_build_array(
  jsonb_build_object(
    'platform', 'instagram',
    'value', trim(both '@' from p.social_username)
  )
)
WHERE trim(coalesce(p.social_username, '')) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p.profile_links) AS item
    WHERE lower(coalesce(item->>'platform', '')) = 'instagram'
  );

DROP FUNCTION IF EXISTS public.get_public_profile(text);

CREATE FUNCTION public.get_public_profile(p_handle text)
RETURNS TABLE (
  profile_id uuid,
  profile_handle text,
  profile_display_name text,
  profile_accepting_requests boolean,
  profile_licensing_notes text,
  profile_min_license_fee_inr integer,
  profile_links jsonb
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
    p.min_license_fee_inr,
    COALESCE(p.profile_links, '[]'::jsonb)
  FROM public.profiles p
  WHERE p.handle IS NOT NULL
    AND trim(p.handle) <> ''
    AND lower(trim(p.handle)) = lower(trim(p_handle))
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_public_profile(text) IS
  'Public creator card fields for /k/:handle (no auth). Includes minimum licensing fee and public profile links.';

REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated, service_role;
