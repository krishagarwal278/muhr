-- Table: ai_review_cache

-- Stores ephemeral AI review results keyed by a fingerprint of contract+metadata.
-- TTL: check expires_at before returning.

CREATE TABLE IF NOT EXISTS public.ai_review_cache (
  fingerprint text PRIMARY KEY,
  license_request_id uuid,
  result jsonb NOT NULL,
  overall_risk text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

COMMENT ON TABLE public.ai_review_cache IS 'Ephemeral cache for AI contract reviews. Do not store PII in result.';

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS ai_review_cache_expires_idx ON public.ai_review_cache (expires_at);
