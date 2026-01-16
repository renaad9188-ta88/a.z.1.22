-- نظام إدارة خطوط الرحلات والنقاط
-- هدف: إدارة خطوط النقل من دمشق (ساحة المرجة) إلى عمان (مجمع الشرق الأوسط)
-- مع نقاط التوقف الثابتة ونقاط النزول المخصصة

-- 1) جدول خطوط الرحلات (Routes)
CREATE TABLE IF NOT EXISTS public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, -- مثال: "دمشق - عمان"
  description text,
  start_location_name text NOT NULL, -- "ساحة المرجة - دمشق"
  start_lat double precision NOT NULL,
  start_lng double precision NOT NULL,
  end_location_name text NOT NULL, -- "مجمع الشرق الأوسط - عمان"
  end_lat double precision NOT NULL,
  end_lng double precision NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routes_is_active ON public.routes(is_active);

-- 2) جدول نقاط التوقف الثابتة (Stop Points) - لكل خط
CREATE TABLE IF NOT EXISTS public.route_stop_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  name text NOT NULL, -- مثال: "نقطة وقوف 1"
  description text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  order_index integer NOT NULL DEFAULT 0, -- ترتيب النقطة على الخط
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_stop_points_route_id ON public.route_stop_points(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stop_points_order ON public.route_stop_points(route_id, order_index);

-- 3) جدول ربط السائقين بالخطوط
CREATE TABLE IF NOT EXISTS public.route_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(route_id, driver_id)
);

CREATE INDEX IF NOT EXISTS idx_route_drivers_route_id ON public.route_drivers(route_id);
CREATE INDEX IF NOT EXISTS idx_route_drivers_driver_id ON public.route_drivers(driver_id);

-- 4) جدول نقاط النزول المخصصة (Custom Dropoff Points) - لكل طلب
CREATE TABLE IF NOT EXISTS public.request_dropoff_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.visit_requests(id) ON DELETE CASCADE,
  route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL,
  name text NOT NULL, -- اسم النقطة (من المستخدم)
  address text, -- العنوان الكامل
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  notes text, -- ملاحظات إضافية
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
  -- نقطة نزول واحدة لكل طلب (Required for UPSERT on request_id)
  ,UNIQUE (request_id)
);

CREATE INDEX IF NOT EXISTS idx_request_dropoff_points_request_id ON public.request_dropoff_points(request_id);
CREATE INDEX IF NOT EXISTS idx_request_dropoff_points_route_id ON public.request_dropoff_points(route_id);

-- 5) تحديث جدول trip_stops ليربط مع route_stop_points (اختياري)
-- يمكن استخدام trip_stops الحالي أو ربطه مع route_stop_points

-- updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_routes_updated_at'
  ) THEN
    CREATE TRIGGER update_routes_updated_at
    BEFORE UPDATE ON public.routes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_route_stop_points_updated_at'
  ) THEN
    CREATE TRIGGER update_route_stop_points_updated_at
    BEFORE UPDATE ON public.route_stop_points
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_request_dropoff_points_updated_at'
  ) THEN
    CREATE TRIGGER update_request_dropoff_points_updated_at
    BEFORE UPDATE ON public.request_dropoff_points
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stop_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_dropoff_points ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Routes: الإدمن فقط يرى/يدير
DROP POLICY IF EXISTS "Admin can view routes" ON public.routes;
CREATE POLICY "Admin can view routes"
  ON public.routes FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage routes" ON public.routes;
CREATE POLICY "Admin can manage routes"
  ON public.routes FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Route Stop Points: الإدمن فقط
DROP POLICY IF EXISTS "Admin can view stop points" ON public.route_stop_points;
CREATE POLICY "Admin can view stop points"
  ON public.route_stop_points FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage stop points" ON public.route_stop_points;
CREATE POLICY "Admin can manage stop points"
  ON public.route_stop_points FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Route Drivers: الإدمن فقط
DROP POLICY IF EXISTS "Admin can view route drivers" ON public.route_drivers;
CREATE POLICY "Admin can view route drivers"
  ON public.route_drivers FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage route drivers" ON public.route_drivers;
CREATE POLICY "Admin can manage route drivers"
  ON public.route_drivers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Request Dropoff Points: المستخدم يرى/يدير نقاطه فقط، الإدمن يرى الكل
DROP POLICY IF EXISTS "Users can view their dropoff points" ON public.request_dropoff_points;
CREATE POLICY "Users can view their dropoff points"
  ON public.request_dropoff_points FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.visit_requests vr
      WHERE vr.id = request_dropoff_points.request_id
        AND vr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their dropoff points" ON public.request_dropoff_points;
CREATE POLICY "Users can manage their dropoff points"
  ON public.request_dropoff_points FOR ALL
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.visit_requests vr
      WHERE vr.id = request_dropoff_points.request_id
        AND vr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.visit_requests vr
      WHERE vr.id = request_dropoff_points.request_id
        AND vr.user_id = auth.uid()
    )
  );

-- إدراج خط افتراضي: دمشق - عمان
INSERT INTO public.routes (name, description, start_location_name, start_lat, start_lng, end_location_name, end_lat, end_lng, is_active)
VALUES (
  'دمشق - عمان',
  'خط النقل الرئيسي من ساحة المرجة في دمشق إلى مجمع الشرق الأوسط في عمان',
  'ساحة المرجة - دمشق',
  33.5138, 36.2765, -- إحداثيات ساحة المرجة تقريباً
  'مجمع الشرق الأوسط - عمان',
  31.9539, 35.9106, -- إحداثيات مجمع الشرق الأوسط تقريباً
  true
)
ON CONFLICT DO NOTHING;

-- ملاحظة: نقاط التوقف الثابتة يمكن إضافتها من واجهة الإدمن
-- أو يمكن إضافتها هنا كبيانات أولية

