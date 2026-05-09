-- Collaborative license contract (TipTap JSON) + dual signatures before payment

ALTER TABLE license_requests
  ADD COLUMN IF NOT EXISTS contract_body jsonb,
  ADD COLUMN IF NOT EXISTS contract_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS creator_signed_contract_at timestamptz,
  ADD COLUMN IF NOT EXISTS brand_signed_contract_at timestamptz,
  ADD COLUMN IF NOT EXISTS creator_signatory_name text,
  ADD COLUMN IF NOT EXISTS brand_signatory_name text;

-- Refresh PostgREST schema cache so the API sees new columns immediately
NOTIFY pgrst, 'reload schema';
