-- Vault encryption metadata (client-side AES-GCM; server stores ciphertext only)

ALTER TABLE vault_assets
  ADD COLUMN IF NOT EXISTS encryption_key_id TEXT,
  ADD COLUMN IF NOT EXISTS encryption_version INT,
  ADD COLUMN IF NOT EXISTS encryption_alg TEXT,
  ADD COLUMN IF NOT EXISTS encryption_iv TEXT,
  ADD COLUMN IF NOT EXISTS wrapped_data_key TEXT,
  ADD COLUMN IF NOT EXISTS wrapped_key_iv TEXT,
  ADD COLUMN IF NOT EXISTS wrapped_key_salt TEXT,
  ADD COLUMN IF NOT EXISTS original_file_name TEXT,
  ADD COLUMN IF NOT EXISTS original_mime_type TEXT;

CREATE INDEX IF NOT EXISTS idx_vault_assets_encryption_key_id
  ON vault_assets(user_id, encryption_key_id)
  WHERE encryption_key_id IS NOT NULL;

