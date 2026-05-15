-- In-app negotiation: messages, agreed budget, payment placeholder, contract effective date

ALTER TABLE license_requests
  ADD COLUMN IF NOT EXISTS agreed_budget_inr int,
  ADD COLUMN IF NOT EXISTS brand_payment_cleared_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_effective_at timestamptz;

COMMENT ON COLUMN license_requests.agreed_budget_inr IS 'Creator-recorded agreed fee (INR) after negotiation in workspace.';
COMMENT ON COLUMN license_requests.brand_payment_cleared_at IS 'Brand completed payment step (placeholder until real payments).';
COMMENT ON COLUMN license_requests.contract_effective_at IS 'Set when payment is cleared and both parties have signed; license terms in force from this time.';

CREATE TABLE IF NOT EXISTS license_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_request_id uuid NOT NULL REFERENCES license_requests(id) ON DELETE CASCADE,
  author_role text NOT NULL CHECK (author_role IN ('creator', 'brand')),
  body text NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 8000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_license_request_messages_request_created
  ON license_request_messages (license_request_id, created_at DESC);

ALTER TABLE license_request_messages ENABLE ROW LEVEL SECURITY;

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
