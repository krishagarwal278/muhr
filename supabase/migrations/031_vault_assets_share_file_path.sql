-- Plaintext share copy for encrypted character sheets (legacy) and future dual-upload.
ALTER TABLE public.vault_assets
  ADD COLUMN IF NOT EXISTS share_file_path text;

COMMENT ON COLUMN public.vault_assets.share_file_path IS
  'Optional plaintext storage path for brand delivery when file_path is encrypted.';
