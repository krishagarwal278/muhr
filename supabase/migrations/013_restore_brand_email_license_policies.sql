-- Restore brand SELECT / messaging policies to JWT email match on brand_email (009 + 011 behavior).
-- Migration 012 required brand_user_id for brand app + RLS; that excluded legacy rows and broke
-- in-app chat for brands whose requests predate linkage. brand_user_id column remains optional.

DROP POLICY IF EXISTS "authenticated_select_license_requests_submitted_as_brand" ON license_requests;
CREATE POLICY "authenticated_select_license_requests_submitted_as_brand"
  ON license_requests
  FOR SELECT
  TO authenticated
  USING (
    trim(COALESCE(auth.jwt() ->> 'email', '')) <> ''
    AND lower(trim(brand_email)) = lower(trim(auth.jwt() ->> 'email'))
  );

DROP POLICY IF EXISTS "authenticated_read_creator_profiles_for_own_license_requests" ON profiles;
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

DROP POLICY IF EXISTS "license_request_messages_select_parties" ON license_request_messages;
CREATE POLICY "license_request_messages_select_parties"
  ON license_request_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM license_requests lr
      WHERE lr.id = license_request_id
        AND (
          lr.creator_id = auth.uid()
          OR (
            trim(COALESCE(auth.jwt() ->> 'email', '')) <> ''
            AND lower(trim(lr.brand_email)) = lower(trim(auth.jwt() ->> 'email'))
          )
        )
    )
  );

DROP POLICY IF EXISTS "license_request_messages_insert_creator" ON license_request_messages;
CREATE POLICY "license_request_messages_insert_creator"
  ON license_request_messages FOR INSERT
  WITH CHECK (
    author_role = 'creator'
    AND EXISTS (
      SELECT 1 FROM license_requests lr
      WHERE lr.id = license_request_id
        AND lr.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "license_request_messages_insert_brand" ON license_request_messages;
CREATE POLICY "license_request_messages_insert_brand"
  ON license_request_messages FOR INSERT
  WITH CHECK (
    author_role = 'brand'
    AND EXISTS (
      SELECT 1 FROM license_requests lr
      WHERE lr.id = license_request_id
        AND trim(COALESCE(auth.jwt() ->> 'email', '')) <> ''
        AND lower(trim(lr.brand_email)) = lower(trim(auth.jwt() ->> 'email'))
    )
  );

NOTIFY pgrst, 'reload schema';
