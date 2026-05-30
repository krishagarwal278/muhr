-- Align license_deliveries brand SELECT with license_requests (013): match brand_email
-- when brand_user_id is not yet linked, not only brand_user_id = auth.uid().

DROP POLICY IF EXISTS "Brand can view deliveries for their requests" ON public.license_deliveries;

CREATE POLICY "Brand can view deliveries for their requests"
  ON public.license_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.license_requests lr
      WHERE lr.id = license_request_id
        AND (
          lr.brand_user_id = auth.uid()
          OR (
            trim(COALESCE(auth.jwt() ->> 'email', '')) <> ''
            AND lower(trim(lr.brand_email)) = lower(trim(auth.jwt() ->> 'email'))
          )
        )
    )
  );

-- Creator can view deliveries on their license requests (not only delivered_by match).
DROP POLICY IF EXISTS "Creator can view own deliveries" ON public.license_deliveries;

CREATE POLICY "Creator can view own deliveries"
  ON public.license_deliveries FOR SELECT
  USING (
    delivered_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.license_requests lr
      WHERE lr.id = license_request_id
        AND lr.creator_id = auth.uid()
    )
  );
