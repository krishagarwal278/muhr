-- Table: ai_review_counters

-- Per-user daily counters to rate-limit AI usage and estimate spend.

CREATE TABLE IF NOT EXISTS public.ai_review_counters (
  user_id uuid NOT NULL,
  day date NOT NULL,
  review_count integer NOT NULL DEFAULT 0,
  estimated_cost_cents integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

COMMENT ON TABLE public.ai_review_counters IS 'Daily counters for AI review usage per user.';
