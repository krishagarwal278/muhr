-- Migration: license counter-offers
-- Creators can propose revised terms (channels, territories, duration, budget).
-- Brands can accept or decline counter-offers.

CREATE TABLE IF NOT EXISTS public.license_counter_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_request_id uuid NOT NULL REFERENCES public.license_requests(id) ON DELETE CASCADE,
  
  -- Proposed terms
  channels text[] NOT NULL DEFAULT '{}',
  territories text[] NOT NULL DEFAULT '{}',
  duration_days integer NOT NULL,
  proposed_budget_inr integer NOT NULL,
  note text,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  
  CONSTRAINT positive_duration CHECK (duration_days > 0),
  CONSTRAINT positive_budget CHECK (proposed_budget_inr > 0)
);

COMMENT ON TABLE public.license_counter_offers IS 'Counter-offers proposed by creators to revise license request terms.';
COMMENT ON COLUMN public.license_counter_offers.channels IS 'Revised channels for the license (e.g., ["Instagram", "Facebook"]).';
COMMENT ON COLUMN public.license_counter_offers.territories IS 'Revised territories (e.g., ["India", "Global"]).';
COMMENT ON COLUMN public.license_counter_offers.duration_days IS 'Revised duration in days.';
COMMENT ON COLUMN public.license_counter_offers.proposed_budget_inr IS 'Creator-proposed budget in INR.';
COMMENT ON COLUMN public.license_counter_offers.note IS 'Optional explanation from creator to brand.';
COMMENT ON COLUMN public.license_counter_offers.status IS 'pending, accepted, or declined.';
COMMENT ON COLUMN public.license_counter_offers.responded_at IS 'When the brand accepted or declined this counter-offer.';

CREATE INDEX idx_license_counter_offers_request ON public.license_counter_offers(license_request_id);
CREATE INDEX idx_license_counter_offers_status ON public.license_counter_offers(status);
CREATE INDEX idx_license_counter_offers_created_at ON public.license_counter_offers(created_at DESC);

-- RLS: Creators can insert their own counter-offers; brands can read counter-offers for their requests
ALTER TABLE public.license_counter_offers ENABLE ROW LEVEL SECURITY;

-- Creators can insert counter-offers for requests they received
CREATE POLICY license_counter_offers_creator_insert
  ON public.license_counter_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.license_requests lr
      WHERE lr.id = license_counter_offers.license_request_id
        AND lr.creator_id = auth.uid()
    )
  );

-- Creators can read their own counter-offers
CREATE POLICY license_counter_offers_creator_select
  ON public.license_counter_offers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.license_requests lr
      WHERE lr.id = license_counter_offers.license_request_id
        AND lr.creator_id = auth.uid()
    )
  );

-- Brands can read counter-offers for their requests (case-insensitive email match)
CREATE POLICY license_counter_offers_brand_select
  ON public.license_counter_offers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.license_requests lr
      WHERE lr.id = license_counter_offers.license_request_id
        AND trim(COALESCE(auth.jwt() ->> 'email', '')) <> ''
        AND lower(trim(lr.brand_email)) = lower(trim(auth.jwt() ->> 'email'))
    )
  );

-- Brands can update counter-offer status (accept/decline)
CREATE POLICY license_counter_offers_brand_update
  ON public.license_counter_offers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.license_requests lr
      WHERE lr.id = license_counter_offers.license_request_id
        AND trim(COALESCE(auth.jwt() ->> 'email', '')) <> ''
        AND lower(trim(lr.brand_email)) = lower(trim(auth.jwt() ->> 'email'))
    )
  );

GRANT SELECT, INSERT ON public.license_counter_offers TO authenticated;
GRANT UPDATE (status, responded_at) ON public.license_counter_offers TO authenticated;
