import { readFileSync } from "fs";
import { join } from "path";

/**
 * Keep in sync with `supabase/migrations/005_license_contract.sql`.
 * Used when the migration file is not on disk (e.g. some deploy bundles).
 */
const EMBEDDED_LICENSE_CONTRACT_MIGRATION = `-- Collaborative license contract (TipTap JSON) + dual signatures before payment

ALTER TABLE license_requests
  ADD COLUMN IF NOT EXISTS contract_body jsonb,
  ADD COLUMN IF NOT EXISTS contract_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS creator_signed_contract_at timestamptz,
  ADD COLUMN IF NOT EXISTS brand_signed_contract_at timestamptz,
  ADD COLUMN IF NOT EXISTS creator_signatory_name text,
  ADD COLUMN IF NOT EXISTS brand_signatory_name text;

-- Refresh PostgREST schema cache so the API sees new columns immediately
NOTIFY pgrst, 'reload schema';
`;

/** Same SQL as migration 005 — prefer repo file when present. */
export function readLicenseContractMigrationSql(): string {
  try {
    return readFileSync(
      join(process.cwd(), "supabase/migrations/005_license_contract.sql"),
      "utf8"
    );
  } catch {
    return EMBEDDED_LICENSE_CONTRACT_MIGRATION;
  }
}
