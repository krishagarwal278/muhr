-- Image uploads: metadata in identity_verification_files / character_photos,
-- binary files in storage bucket `assets` under {user_id}/...

-- Storage upsert requires INSERT + SELECT + UPDATE (identity re-submit uses upsert: true)
CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'assets'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'assets'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

ALTER TABLE identity_verification_files
  ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'assets',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE character_photos
  ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'assets',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS identity_verification_files_updated_at ON identity_verification_files;
CREATE TRIGGER identity_verification_files_updated_at
  BEFORE UPDATE ON identity_verification_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS character_photos_updated_at ON character_photos;
CREATE TRIGGER character_photos_updated_at
  BEFORE UPDATE ON character_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
