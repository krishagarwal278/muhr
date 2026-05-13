-- Tie license requests to a signed-in brand account for in-app workspace + messaging.
-- NULL = legacy / public form submission (still visible to creator under Licenses only).

ALTER TABLE license_requests
  ADD COLUMN IF NOT EXISTS brand_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN license_requests.brand_user_id IS
  'Auth user id of the brand when they submitted while signed in with the same email as brand_email and have a profiles row. NULL = public/anonymous form; excluded from brand app, messaging, and dashboard stats.';

CREATE INDEX IF NOT EXISTS idx_license_requests_brand_user_id
  ON license_requests (brand_user_id)
  WHERE brand_user_id IS NOT NULL;

-- Brand may only read requests they submitted as their authenticated account (not email-only legacy rows).
DROP POLICY IF EXISTS "authenticated_select_license_requests_submitted_as_brand" ON license_requests;
CREATE POLICY "authenticated_select_license_requests_submitted_as_brand"
  ON license_requests
  FOR SELECT
  TO authenticated
  USING (
    brand_user_id IS NOT NULL
    AND brand_user_id = auth.uid()
  );

-- Creator profile read for brands: only for verified linked requests.
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
        AND lr.brand_user_id = auth.uid()
    )
  );

-- Messaging only for verified-brand requests (brand_user_id set).
DROP POLICY IF EXISTS "license_request_messages_select_parties" ON license_request_messages;
CREATE POLICY "license_request_messages_select_parties"
  ON license_request_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM license_requests lr
      WHERE lr.id = license_request_id
        AND lr.brand_user_id IS NOT NULL
        AND (lr.creator_id = auth.uid() OR lr.brand_user_id = auth.uid())
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
        AND lr.brand_user_id IS NOT NULL
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
        AND lr.brand_user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
