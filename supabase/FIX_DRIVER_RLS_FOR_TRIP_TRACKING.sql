-- Fix RLS for trip tracking tables so drivers can publish live location + manage trip stops
-- Assumptions:
-- - public.is_admin() exists
-- - public.is_driver() exists (see LINK_DRIVERS_TO_AUTH.sql)
-- - drivers.user_id links auth.users(id) -> drivers row
-- - visit_requests.route_id exists and is used to assign requests to routes
-- - route_drivers.driver_id references drivers.id

ALTER TABLE public.trip_driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_stops ENABLE ROW LEVEL SECURITY;

-- Drivers can manage trip driver locations for requests on their assigned routes
DROP POLICY IF EXISTS "Drivers can manage trip driver locations" ON public.trip_driver_locations;
CREATE POLICY "Drivers can manage trip driver locations"
  ON public.trip_driver_locations FOR ALL
  USING (
    public.is_admin()
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.visit_requests vr
        JOIN public.route_drivers rd ON rd.route_id = vr.route_id AND rd.is_active = true
        JOIN public.drivers d ON d.id = rd.driver_id
        WHERE vr.id = trip_driver_locations.request_id
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
        WHERE vr.id = trip_driver_locations.request_id
          AND d.user_id = auth.uid()
      )
    )
  );

-- Drivers can manage trip stops for requests on their assigned routes
DROP POLICY IF EXISTS "Drivers can manage trip stops" ON public.trip_stops;
CREATE POLICY "Drivers can manage trip stops"
  ON public.trip_stops FOR ALL
  USING (
    public.is_admin()
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.visit_requests vr
        JOIN public.route_drivers rd ON rd.route_id = vr.route_id AND rd.is_active = true
        JOIN public.drivers d ON d.id = rd.driver_id
        WHERE vr.id = trip_stops.request_id
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
        WHERE vr.id = trip_stops.request_id
          AND d.user_id = auth.uid()
      )
    )
  );


