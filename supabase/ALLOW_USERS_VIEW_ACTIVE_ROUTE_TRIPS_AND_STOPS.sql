-- Allow authenticated users to view active route trips and their stop points (for /trips and booking UI)
-- Run in Supabase SQL Editor.
-- Assumptions:
-- - route_trips + route_trip_stop_points exist
-- - public.is_admin() exists (optional)

ALTER TABLE public.route_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_trip_stop_points ENABLE ROW LEVEL SECURITY;

-- Users (authenticated) can view active trips
DROP POLICY IF EXISTS "Users can view active route_trips" ON public.route_trips;
CREATE POLICY "Users can view active route_trips"
  ON public.route_trips FOR SELECT
  USING (
    public.is_admin()
    OR (is_active = true)
  );

-- Users (authenticated) can view stop points for active trips
DROP POLICY IF EXISTS "Users can view stop points for active trips" ON public.route_trip_stop_points;
CREATE POLICY "Users can view stop points for active trips"
  ON public.route_trip_stop_points FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.route_trips rt
      WHERE rt.id = route_trip_stop_points.trip_id
        AND rt.is_active = true
    )
  );


