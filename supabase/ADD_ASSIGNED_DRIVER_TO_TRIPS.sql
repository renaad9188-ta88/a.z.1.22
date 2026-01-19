-- Add per-trip driver assignment (assigned_driver_id) to visit_requests
-- so admin can choose the specific driver for each trip (not only via route).
--
-- Run in Supabase SQL Editor.

ALTER TABLE public.visit_requests
  ADD COLUMN IF NOT EXISTS assigned_driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_visit_requests_assigned_driver_id
  ON public.visit_requests(assigned_driver_id);

-- Drivers can view requests assigned to them (in addition to route-based access).
ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view assigned trip requests" ON public.visit_requests;
CREATE POLICY "Drivers can view assigned trip requests"
  ON public.visit_requests FOR SELECT
  USING (
    public.is_admin()
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.drivers d
        WHERE d.id = visit_requests.assigned_driver_id
          AND d.user_id = auth.uid()
      )
    )
  );

-- Trip tracking tables: allow assigned driver to manage locations/stops
ALTER TABLE public.trip_driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assigned drivers can manage trip driver locations" ON public.trip_driver_locations;
CREATE POLICY "Assigned drivers can manage trip driver locations"
  ON public.trip_driver_locations FOR ALL
  USING (
    public.is_admin()
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.visit_requests vr
        JOIN public.drivers d ON d.id = vr.assigned_driver_id
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
        JOIN public.drivers d ON d.id = vr.assigned_driver_id
        WHERE vr.id = trip_driver_locations.request_id
          AND d.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Assigned drivers can manage trip stops" ON public.trip_stops;
CREATE POLICY "Assigned drivers can manage trip stops"
  ON public.trip_stops FOR ALL
  USING (
    public.is_admin()
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.visit_requests vr
        JOIN public.drivers d ON d.id = vr.assigned_driver_id
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
        JOIN public.drivers d ON d.id = vr.assigned_driver_id
        WHERE vr.id = trip_stops.request_id
          AND d.user_id = auth.uid()
      )
    )
  );


