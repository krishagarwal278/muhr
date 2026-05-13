-- Allow authenticated brands to read license requests they submitted (brand_email matches JWT email),
-- and to read partner creator public profile fields for those rows (handle / display_name only via join).

CREATE POLICY "authenticated_select_license_requests_submitted_as_brand"
  ON license_requests
  FOR SELECT
  TO authenticated
  USING (
    trim(COALESCE(auth.jwt() ->> 'email', '')) <> ''
    AND lower(trim(brand_email)) = lower(trim(auth.jwt() ->> 'email'))
  );

CREATE POLICY "authenticated_read_creator_profiles_for_own_license_requests"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM license_requests lr
      WHERE lr.creator_id = profiles.id
        AND trim(COALESCE(auth.jwt() ->> 'email', '')) <> ''
        AND lower(trim(lr.brand_email)) = lower(trim(auth.jwt() ->> 'email'))
    )
  );

CREATE INDEX IF NOT EXISTS idx_license_requests_brand_email_lower
  ON license_requests (lower(trim(brand_email)));

NOTIFY pgrst, 'reload schema';
