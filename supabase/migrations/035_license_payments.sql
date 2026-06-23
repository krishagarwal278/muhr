-- Razorpay license payments (Standard Checkout; manual creator payouts for now)

DO $$ BEGIN
  CREATE TYPE license_payment_status AS ENUM ('created', 'authorized', 'captured', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS license_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_request_id uuid NOT NULL REFERENCES license_requests(id) ON DELETE RESTRICT,
  brand_user_id uuid NOT NULL,
  creator_id uuid NOT NULL,

  -- Razorpay amounts are in paise
  amount_paise bigint NOT NULL CHECK (amount_paise > 0),
  currency text NOT NULL DEFAULT 'INR',

  rzp_order_id text NOT NULL UNIQUE,
  rzp_payment_id text UNIQUE,
  rzp_signature text,

  status license_payment_status NOT NULL DEFAULT 'created',
  failure_reason text,

  -- Manual bank transfer to creator until Razorpay Route is enabled
  creator_payout_status text NOT NULL DEFAULT 'pending_manual'
    CHECK (creator_payout_status IN ('pending_manual', 'paid')),

  notes jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS license_payments_license_request_id_idx
  ON license_payments(license_request_id);

CREATE INDEX IF NOT EXISTS license_payments_rzp_order_id_idx
  ON license_payments(rzp_order_id);

CREATE INDEX IF NOT EXISTS license_payments_status_idx
  ON license_payments(status);

COMMENT ON TABLE license_payments IS 'Razorpay checkout records for accepted license requests.';
COMMENT ON COLUMN license_payments.creator_payout_status IS 'Manual payout tracking until Razorpay Route split payments.';

ALTER TABLE license_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands read own license payments" ON license_payments;
CREATE POLICY "brands read own license payments" ON license_payments
  FOR SELECT USING (brand_user_id = auth.uid());

DROP POLICY IF EXISTS "creators read own license payments" ON license_payments;
CREATE POLICY "creators read own license payments" ON license_payments
  FOR SELECT USING (creator_id = auth.uid());

-- Inserts/updates via service role only (API routes + webhooks)
