-- Admin-defined trip slots + driver live availability/location (for "متاح" button).
-- Run in Supabase SQL Editor.

-- 1) Trip slots per route
CREATE TABLE IF NOT EXISTS public.route_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  trip_date date NOT NULL,
  meeting_time time,          -- وقت التجمع (اختياري)
  departure_time time,        -- وقت الانطلاق
  start_location_name text NOT NULL,
  start_lat double precision NOT NULL,
  start_lng double precision NOT NULL,
  end_location_name text NOT NULL,
  end_lat double precision NOT NULL,
  end_lng double precision NOT NULL,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_trips_route_date ON public.route_trips(route_id, trip_date);
CREATE INDEX IF NOT EXISTS idx_route_trips_active_date ON public.route_trips(is_active, trip_date);

-- 2) Trip stop points (fixed stops on the way)
CREATE TABLE IF NOT EXISTS public.route_trip_stop_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.route_trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_trip_stops_trip ON public.route_trip_stop_points(trip_id, order_index);

-- 3) Assign drivers to trips
CREATE TABLE IF NOT EXISTS public.route_trip_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.route_trips(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trip_id, driver_id)
);

CREATE INDEX IF NOT EXISTS idx_route_trip_drivers_trip ON public.route_trip_drivers(trip_id);
CREATE INDEX IF NOT EXISTS idx_route_trip_drivers_driver ON public.route_trip_drivers(driver_id);

-- 4) Driver live availability + last location (for admin map)
CREATE TABLE IF NOT EXISTS public.driver_live_status (
  driver_id uuid PRIMARY KEY REFERENCES public.drivers(id) ON DELETE CASCADE,
  is_available boolean NOT NULL DEFAULT false,
  lat double precision,
  lng double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger (reuse existing function public.update_updated_at_column())
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_route_trips_updated_at') THEN
    CREATE TRIGGER update_route_trips_updated_at
    BEFORE UPDATE ON public.route_trips
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_route_trip_stop_points_updated_at') THEN
    CREATE TRIGGER update_route_trip_stop_points_updated_at
    BEFORE UPDATE ON public.route_trip_stop_points
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_driver_live_status_updated_at') THEN
    CREATE TRIGGER update_driver_live_status_updated_at
    BEFORE UPDATE ON public.driver_live_status
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.route_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_trip_stop_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_trip_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_live_status ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admin can manage all trip slots/stops/assignments
DROP POLICY IF EXISTS "Admin can manage route_trips" ON public.route_trips;
CREATE POLICY "Admin can manage route_trips"
  ON public.route_trips FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage route_trip_stop_points" ON public.route_trip_stop_points;
CREATE POLICY "Admin can manage route_trip_stop_points"
  ON public.route_trip_stop_points FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage route_trip_drivers" ON public.route_trip_drivers;
CREATE POLICY "Admin can manage route_trip_drivers"
  ON public.route_trip_drivers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Drivers can view trips they are assigned to
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

-- driver live status: admin can view all, drivers can upsert/update their own row
DROP POLICY IF EXISTS "Admin can view driver_live_status" ON public.driver_live_status;
CREATE POLICY "Admin can view driver_live_status"
  ON public.driver_live_status FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Drivers can manage their own live status" ON public.driver_live_status;
CREATE POLICY "Drivers can manage their own live status"
  ON public.driver_live_status FOR ALL
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_live_status.driver_id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_live_status.driver_id
        AND d.user_id = auth.uid()
    )
  );


