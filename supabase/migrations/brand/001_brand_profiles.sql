-- Create brand_profiles table for storing brand profile details
CREATE TABLE IF NOT EXISTS brand_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text,
  pin_code text,
  primary_email text NOT NULL,
  secondary_email text NOT NULL,
  phone text NOT NULL,
  rep_name text,
  rep_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: allow users to manage their own brand_profile rows
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own brand profile" ON brand_profiles
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
