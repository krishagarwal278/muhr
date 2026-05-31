-- Brand workspace company profile + verification document metadata

CREATE TABLE IF NOT EXISTS brand_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL DEFAULT '',
  address_line1 text NOT NULL DEFAULT '',
  address_line2 text,
  city text,
  pin_code text,
  primary_email text NOT NULL DEFAULT '',
  secondary_email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  rep_name text,
  rep_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brand_profiles_user_id_key UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS brand_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brand_verification_documents_user_path_key UNIQUE (user_id, file_path)
);

CREATE INDEX IF NOT EXISTS brand_verification_documents_user_id_idx
  ON brand_verification_documents (user_id);

CREATE INDEX IF NOT EXISTS brand_verification_documents_user_type_idx
  ON brand_verification_documents (user_id, document_type);

ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_verification_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own brand profile" ON brand_profiles;
CREATE POLICY "Users manage own brand profile" ON brand_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own brand verification documents" ON brand_verification_documents;
CREATE POLICY "Users manage own brand verification documents" ON brand_verification_documents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS brand_profiles_updated_at ON brand_profiles;
CREATE TRIGGER brand_profiles_updated_at
  BEFORE UPDATE ON brand_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
