-- AI character sheet: vault asset type + generation metadata

ALTER TABLE vault_assets DROP CONSTRAINT IF EXISTS vault_assets_asset_type_check;
ALTER TABLE vault_assets ADD CONSTRAINT vault_assets_asset_type_check
  CHECK (asset_type IN ('face_photo', 'voice_sample', 'document', 'character_sheet'));

CREATE TABLE IF NOT EXISTS character_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'generating', 'sealed', 'failed')),
  vault_asset_id uuid REFERENCES vault_assets(id) ON DELETE SET NULL,
  generation_mode text CHECK (generation_mode IN ('ai', 'compose')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sealed_at timestamptz,
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_character_sheets_user ON character_sheets(user_id);

ALTER TABLE character_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own character sheets"
  ON character_sheets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own character sheets"
  ON character_sheets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own character sheets"
  ON character_sheets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER character_sheets_updated_at
  BEFORE UPDATE ON character_sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
