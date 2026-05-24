-- Structured address fields for creator onboarding
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_pin_code text;

-- Backfill structured fields from legacy single-line address where possible
UPDATE profiles
SET address_line1 = address
WHERE address_line1 IS NULL
  AND address IS NOT NULL
  AND btrim(address) <> '';

-- Admin inbox for identity review and other operator alerts (service-role only)
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_kind_created
  ON admin_notifications (kind, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_pending
  ON admin_notifications (created_at DESC)
  WHERE acknowledged_at IS NULL;

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- No authenticated/anon policies — query via Supabase dashboard or service role only.

CREATE OR REPLACE FUNCTION notify_identity_review_requested()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  addr text;
BEGIN
  IF NEW.kyc_status = 'pending'
     AND NEW.identity_submitted_at IS NOT NULL
     AND (
       OLD.kyc_status IS DISTINCT FROM 'pending'
       OR OLD.identity_submitted_at IS DISTINCT FROM NEW.identity_submitted_at
     )
  THEN
    addr := nullif(
      concat_ws(
        ', ',
        nullif(btrim(COALESCE(NEW.address_line1, '')), ''),
        nullif(btrim(COALESCE(NEW.address_line2, '')), ''),
        nullif(btrim(COALESCE(NEW.address_city, '')), ''),
        nullif(btrim(COALESCE(NEW.address_pin_code, '')), '')
      ),
      ''
    );
    IF addr IS NULL THEN
      addr := nullif(btrim(COALESCE(NEW.address, '')), '');
    END IF;

    INSERT INTO admin_notifications (kind, user_id, title, body, metadata)
    VALUES (
      'identity_review_requested',
      NEW.id,
      'Identity review submitted',
      COALESCE(nullif(btrim(COALESCE(NEW.full_name, '')), ''), 'Creator')
        || ' submitted for identity review.',
      jsonb_build_object(
        'kyc_status', NEW.kyc_status,
        'handle', NEW.handle,
        'full_name', NEW.full_name,
        'phone', NEW.phone,
        'address', addr,
        'follower_count', NEW.follower_count,
        'identity_submitted_at', NEW.identity_submitted_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_identity_review_notification ON profiles;

CREATE TRIGGER profiles_identity_review_notification
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_identity_review_requested();
