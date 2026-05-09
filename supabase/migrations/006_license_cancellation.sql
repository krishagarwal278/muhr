-- Creator withdrawal: status withdrawn + cancellation metadata

ALTER TABLE license_requests DROP CONSTRAINT IF EXISTS license_requests_status_check;

ALTER TABLE license_requests
  ADD CONSTRAINT license_requests_status_check
  CHECK (
    status IN (
      'pending',
      'accepted',
      'declined',
      'expired',
      'withdrawn'
    )
  );

ALTER TABLE license_requests
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_note text;

NOTIFY pgrst, 'reload schema';
