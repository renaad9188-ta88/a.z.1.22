-- Trip Tracking Tables (Stops + Driver Live Location)
-- هدفها: تتبّع السائق ومحطات التوقف لكل طلب (visit_request)
-- ملاحظة: هذا الملف يفترض وجود دالة is_admin() (Security Definer) كما في ملفات FIX_ADMIN_ACCESS_COMPLETE.sql

-- 1) جدول محطات التوقف
CREATE TABLE IF NOT EXISTS public.trip_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.visit_requests(id) ON DELETE CASCADE,
  title text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_stops_request_id ON public.trip_stops(request_id);

-- 2) جدول موقع السائق الحالي (آخر نقطة)
CREATE TABLE IF NOT EXISTS public.trip_driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.visit_requests(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_driver_locations_request_id ON public.trip_driver_locations(request_id);
CREATE INDEX IF NOT EXISTS idx_trip_driver_locations_updated_at ON public.trip_driver_locations(updated_at DESC);

-- updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_trip_stops_updated_at'
  ) THEN
    CREATE TRIGGER update_trip_stops_updated_at
    BEFORE UPDATE ON public.trip_stops
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_trip_driver_locations_updated_at'
  ) THEN
    CREATE TRIGGER update_trip_driver_locations_updated_at
    BEFORE UPDATE ON public.trip_driver_locations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.trip_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_driver_locations ENABLE ROW LEVEL SECURITY;

-- RLS: المستخدم يرى فقط سجلات الطلبات الخاصة فيه، والإدمن يرى الكل
DROP POLICY IF EXISTS "Users can view their request stops" ON public.trip_stops;
CREATE POLICY "Users can view their request stops"
  ON public.trip_stops FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.visit_requests vr
      WHERE vr.id = trip_stops.request_id
        AND vr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can manage stops" ON public.trip_stops;
CREATE POLICY "Admin can manage stops"
  ON public.trip_stops FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view their request driver location" ON public.trip_driver_locations;
CREATE POLICY "Users can view their request driver location"
  ON public.trip_driver_locations FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.visit_requests vr
      WHERE vr.id = trip_driver_locations.request_id
        AND vr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can manage driver locations" ON public.trip_driver_locations;
CREATE POLICY "Admin can manage driver locations"
  ON public.trip_driver_locations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());



