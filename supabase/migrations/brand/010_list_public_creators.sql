-- Directory of creators with a public handle (for /marketplace). Minimal fields; no KYC or email.

CREATE OR REPLACE FUNCTION public.list_public_creators(p_limit int DEFAULT 48, p_offset int DEFAULT 0)
RETURNS TABLE (
  handle text,
  display_name text,
  accepting_requests boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.handle,
    COALESCE(NULLIF(trim(p.display_name), ''), p.handle)::text AS display_name,
    p.accepting_requests
  FROM profiles p
  WHERE p.handle IS NOT NULL
    AND trim(p.handle) <> ''
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 48), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

COMMENT ON FUNCTION public.list_public_creators(int, int) IS 'Public directory rows for /marketplace (handles only).';

REVOKE ALL ON FUNCTION public.list_public_creators(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_creators(int, int) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
