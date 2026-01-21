-- All-in-one fix: make sure drivers can see their own drivers row, trip assignments, assigned trips, and trip stop points.
-- Run in Supabase SQL Editor.
-- Safe to run multiple times.

-- 1) Ensure helper exists (driver role from profiles)
CREATE OR REPLACE FUNCTION public.is_driver()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND lower(role) = 'driver'
  );
END;
$$;

-- 2) Enable RLS and allow drivers to read their own drivers row (required by policies that join drivers)
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view their own driver record" ON public.drivers;
CREATE POLICY "Drivers can view their own driver record"
  ON public.drivers FOR SELECT
  USING (public.is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can update their own driver record" ON public.drivers;
CREATE POLICY "Drivers can update their own driver record"
  ON public.drivers FOR UPDATE
  USING (public.is_admin() OR user_id = auth.uid())
  WITH CHECK (public.is_admin() OR user_id = auth.uid());

-- 3) Trip assignments
ALTER TABLE public.route_trip_drivers ENABLE ROW LEVEL SECURITY;

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

-- 4) Assigned trips and stop points
ALTER TABLE public.route_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_trip_stop_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view assigned route_trips" ON public.route_trips;
CREATE POLICY "Drivers can view assigned route_trips"
  ON public.route_trips FOR SELECT
  USING (
    public.is_admin()
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.route_trip_drivers rtd
        JOIN public.drivers d ON d.id = rtd.driver_id
        WHERE rtd.trip_id = route_trips.id
          AND rtd.is_active = true
          AND d.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Drivers can view assigned route_trip_stop_points" ON public.route_trip_stop_points;
CREATE POLICY "Drivers can view assigned route_trip_stop_points"
  ON public.route_trip_stop_points FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.route_trip_drivers rtd
      JOIN public.drivers d ON d.id = rtd.driver_id
      WHERE rtd.trip_id = route_trip_stop_points.trip_id
        AND rtd.is_active = true
        AND d.user_id = auth.uid()
    )
  );


