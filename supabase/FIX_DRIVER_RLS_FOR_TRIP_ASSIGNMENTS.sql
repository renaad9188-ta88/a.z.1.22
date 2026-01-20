-- Fix RLS so drivers can see trips assigned via route_trip_drivers
-- This is required for DriverTripsList + driver trip details page.
-- Assumptions:
-- - public.is_admin() exists
-- - public.is_driver() exists (see LINK_DRIVERS_TO_AUTH.sql)
-- - drivers.user_id links auth.users.id -> drivers row

-- Ensure RLS is enabled
ALTER TABLE public.route_trip_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;

-- =========================
-- route_trip_drivers (assignment table)
-- =========================
DROP POLICY IF EXISTS "Drivers can view their trip assignments" ON public.route_trip_drivers;
CREATE POLICY "Drivers can view their trip assignments"
  ON public.route_trip_drivers FOR SELECT
  USING (
    public.is_admin()
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.drivers d
        WHERE d.id = route_trip_drivers.driver_id
          AND d.user_id = auth.uid()
      )
    )
  );

-- =========================
-- visit_requests (passengers linked to trip_id)
-- =========================
-- Allow drivers to view requests that are linked to trips assigned to them.
DROP POLICY IF EXISTS "Drivers can view requests for assigned trips" ON public.visit_requests;
CREATE POLICY "Drivers can view requests for assigned trips"
  ON public.visit_requests FOR SELECT
  USING (
    public.is_admin()
    OR (
      public.is_driver()
      AND trip_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.route_trip_drivers rtd
        JOIN public.drivers d ON d.id = rtd.driver_id
        WHERE rtd.trip_id = visit_requests.trip_id
          AND rtd.is_active = true
          AND d.user_id = auth.uid()
      )
    )
  );


