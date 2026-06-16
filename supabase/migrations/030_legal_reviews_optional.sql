-- Optional table: legal_reviews

-- Stores persisted review results if feature flag ENABLE_LEGAL_REVIEW_PERSISTENCE is set.

CREATE TABLE IF NOT EXISTS public.legal_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_request_id uuid NOT NULL,
  user_id uuid NOT NULL,
  overall_risk text,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.legal_reviews IS 'Persisted legal review results (opt-in). Do NOT store raw contract text here unless explicitly approved.';
