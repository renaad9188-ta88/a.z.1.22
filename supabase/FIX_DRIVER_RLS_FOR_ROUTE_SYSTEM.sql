-- Fix RLS for route system to support admin + driver + users safely.
-- Assumptions:
-- - public.is_admin() exists (created in admin access scripts)
-- - public.is_driver() exists (created in LINK_DRIVERS_TO_AUTH.sql)
-- - route_drivers.driver_id references public.drivers(id)
-- - drivers.user_id links auth.users(id) -> drivers row

-- Enable RLS (idempotent)
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stop_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_dropoff_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Ensure visit_requests has route_id (required for driver/route access checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'visit_requests'
      AND column_name = 'route_id'
  ) THEN
    ALTER TABLE public.visit_requests
      ADD COLUMN route_id uuid NULL REFERENCES public.routes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_visit_requests_route_id ON public.visit_requests(route_id);

-- =========================
-- DRIVERS table
-- =========================
DROP POLICY IF EXISTS "Admin can manage drivers" ON public.drivers;
CREATE POLICY "Admin can manage drivers"
  ON public.drivers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Drivers can view their own driver record" ON public.drivers;
CREATE POLICY "Drivers can view their own driver record"
  ON public.drivers FOR SELECT
  USING (public.is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can update their own driver record" ON public.drivers;
CREATE POLICY "Drivers can update their own driver record"
  ON public.drivers FOR UPDATE
  USING (public.is_admin() OR user_id = auth.uid())
  WITH CHECK (public.is_admin() OR user_id = auth.uid());

-- =========================
-- ROUTES
-- =========================
DROP POLICY IF EXISTS "Anyone can view active routes" ON public.routes;
CREATE POLICY "Anyone can view active routes"
  ON public.routes FOR SELECT
  USING (
    public.is_admin()
    OR is_active = true
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.route_drivers rd
        JOIN public.drivers d ON d.id = rd.driver_id
        WHERE rd.route_id = routes.id
          AND rd.is_active = true
          AND d.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admin can manage routes" ON public.routes;
CREATE POLICY "Admin can manage routes"
  ON public.routes FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =========================
-- ROUTE DRIVERS (assignment table)
-- =========================
DROP POLICY IF EXISTS "Drivers can view their route assignments" ON public.route_drivers;
CREATE POLICY "Drivers can view their route assignments"
  ON public.route_drivers FOR SELECT
  USING (
    public.is_admin()
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.drivers d
        WHERE d.id = route_drivers.driver_id
          AND d.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admin can manage route drivers" ON public.route_drivers;
CREATE POLICY "Admin can manage route drivers"
  ON public.route_drivers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =========================
-- ROUTE STOP POINTS
-- =========================
DROP POLICY IF EXISTS "Anyone can view route stop points" ON public.route_stop_points;
CREATE POLICY "Anyone can view route stop points"
  ON public.route_stop_points FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.routes r
      WHERE r.id = route_stop_points.route_id
        AND r.is_active = true
    )
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.route_drivers rd
        JOIN public.drivers d ON d.id = rd.driver_id
        WHERE rd.route_id = route_stop_points.route_id
          AND rd.is_active = true
          AND d.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Drivers can manage their route stop points" ON public.route_stop_points;
CREATE POLICY "Drivers can manage their route stop points"
  ON public.route_stop_points FOR ALL
  USING (
    public.is_admin()
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.route_drivers rd
        JOIN public.drivers d ON d.id = rd.driver_id
        WHERE rd.route_id = route_stop_points.route_id
          AND rd.is_active = true
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
        FROM public.route_drivers rd
        JOIN public.drivers d ON d.id = rd.driver_id
        WHERE rd.route_id = route_stop_points.route_id
          AND rd.is_active = true
          AND d.user_id = auth.uid()
      )
    )
  );

-- =========================
-- REQUEST DROPOFF POINTS
-- =========================
DROP POLICY IF EXISTS "Users can view their own dropoff points" ON public.request_dropoff_points;
CREATE POLICY "Users can view their own dropoff points"
  ON public.request_dropoff_points FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.visit_requests vr
      WHERE vr.id = request_dropoff_points.request_id
        AND vr.user_id = auth.uid()
    )
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

DROP POLICY IF EXISTS "Users can manage their own dropoff points" ON public.request_dropoff_points;
CREATE POLICY "Users can manage their own dropoff points"
  ON public.request_dropoff_points FOR ALL
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.visit_requests vr
      WHERE vr.id = request_dropoff_points.request_id
        AND vr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.visit_requests vr
      WHERE vr.id = request_dropoff_points.request_id
        AND vr.user_id = auth.uid()
    )
  );


