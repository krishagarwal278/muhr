-- Soft-archive vault assets (restore without re-uploading)
ALTER TABLE vault_assets
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vault_assets_active
  ON vault_assets(user_id, created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vault_assets_archived
  ON vault_assets(user_id, archived_at DESC)
  WHERE archived_at IS NOT NULL;

DROP POLICY IF EXISTS "Users can update own assets" ON vault_assets;
CREATE POLICY "Users can update own assets" ON vault_assets
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
