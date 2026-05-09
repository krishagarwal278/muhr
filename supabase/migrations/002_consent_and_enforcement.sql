-- Create consent_rules table (one row per user)
CREATE TABLE IF NOT EXISTS consent_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  channels TEXT[] DEFAULT '{}',
  territories TEXT[] DEFAULT '{}',
  blocked_categories TEXT[] DEFAULT ARRAY['politics', 'adult'],
  allow_voice_synthesis BOOLEAN DEFAULT FALSE,
  allow_face_reenactment BOOLEAN DEFAULT FALSE,
  require_approval_per_use BOOLEAN DEFAULT TRUE,
  default_duration_days INTEGER DEFAULT 90,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE consent_rules ENABLE ROW LEVEL SECURITY;

-- Policies for consent_rules
CREATE POLICY "Users can view own consent rules" ON consent_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent rules" ON consent_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consent rules" ON consent_rules
  FOR UPDATE USING (auth.uid() = user_id);

-- Create enforcement_cases table
CREATE TABLE IF NOT EXISTS enforcement_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'rejected')),
  evidence_paths TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE enforcement_cases ENABLE ROW LEVEL SECURITY;

-- Policies for enforcement_cases
CREATE POLICY "Users can view own cases" ON enforcement_cases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cases" ON enforcement_cases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cases" ON enforcement_cases
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_consent_rules_user_id ON consent_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_enforcement_cases_user_id ON enforcement_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_enforcement_cases_status ON enforcement_cases(user_id, status);

-- Trigger to auto-update updated_at for consent_rules
CREATE TRIGGER consent_rules_updated_at
  BEFORE UPDATE ON consent_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger to auto-update updated_at for enforcement_cases
CREATE TRIGGER enforcement_cases_updated_at
  BEFORE UPDATE ON enforcement_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
