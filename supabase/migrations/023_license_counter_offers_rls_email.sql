-- Fix counter-offer brand policies: case-insensitive brand_email match (same as 013).

DROP POLICY IF EXISTS license_counter_offers_brand_select ON public.license_counter_offers;
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

DROP POLICY IF EXISTS license_counter_offers_brand_update ON public.license_counter_offers;
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

NOTIFY pgrst, 'reload schema';
