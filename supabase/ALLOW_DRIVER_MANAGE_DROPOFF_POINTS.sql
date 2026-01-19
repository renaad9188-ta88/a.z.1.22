-- Allow drivers to manage dropoff points for requests that belong to their assigned routes.
-- This is needed so a driver can set/edit the passenger dropoff point from the driver dashboard.

ALTER TABLE public.request_dropoff_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can manage dropoff points for assigned requests" ON public.request_dropoff_points;
CREATE POLICY "Drivers can manage dropoff points for assigned requests"
  ON public.request_dropoff_points
  FOR ALL
  USING (
    public.is_admin()
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.visit_requests vr
        JOIN public.route_drivers rd ON rd.route_id = vr.route_id AND rd.is_active = true
        JOIN public.drivers d ON d.id = rd.driver_id
        WHERE vr.id = request_dropoff_points.request_id
          AND d.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.visit_requests vr
        JOIN public.route_drivers rd ON rd.route_id = vr.route_id AND rd.is_active = true
        JOIN public.drivers d ON d.id = rd.driver_id
        WHERE vr.id = request_dropoff_points.request_id
          AND d.user_id = auth.uid()
      )
    )
  );


