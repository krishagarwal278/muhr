-- Create vault_assets table
CREATE TABLE IF NOT EXISTS vault_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('face_photo', 'voice_sample', 'document')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  hash_sha256 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_vault_assets_user_id ON vault_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_assets_type ON vault_assets(user_id, asset_type);

-- Enable RLS
ALTER TABLE vault_assets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own assets
CREATE POLICY "Users can view own assets" ON vault_assets
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own assets
CREATE POLICY "Users can insert own assets" ON vault_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own assets
CREATE POLICY "Users can delete own assets" ON vault_assets
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vault_assets_updated_at
  BEFORE UPDATE ON vault_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
