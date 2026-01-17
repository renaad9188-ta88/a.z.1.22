-- إضافة دور السائق (driver) للنظام
-- السائق يمكنه إدارة خطوط الرحلات ونقاط التوقف ورؤية قائمة الركاب

-- تحديث constraint للـ role في profiles لإضافة 'driver'
DO $$
BEGIN
  -- إزالة القيد القديم إذا كان موجوداً
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_role_check'
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;

  -- إضافة القيد الجديد مع دور السائق
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('user', 'admin', 'driver'));
END $$;

-- تحديث RLS policies للسائقين
-- السائق يمكنه قراءة ملفه الشخصي فقط
DROP POLICY IF EXISTS "Drivers can view their own profile" ON public.profiles;
CREATE POLICY "Drivers can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Drivers can update their own profile" ON public.profiles;
CREATE POLICY "Drivers can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND role = 'driver');

-- السائق يمكنه رؤية الخطوط المربوطة به
DROP POLICY IF EXISTS "Drivers can view their routes" ON public.routes;
CREATE POLICY "Drivers can view their routes"
  ON public.routes FOR SELECT
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.route_drivers rd
      WHERE rd.route_id = routes.id
        AND rd.driver_id = auth.uid()
        AND rd.is_active = true
    )
  );

-- السائق يمكنه إدارة نقاط التوقف لخطوطه
DROP POLICY IF EXISTS "Drivers can manage their route stops" ON public.route_stop_points;
CREATE POLICY "Drivers can manage their route stops"
  ON public.route_stop_points FOR ALL
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.route_drivers rd
      WHERE rd.route_id = route_stop_points.route_id
        AND rd.driver_id = auth.uid()
        AND rd.is_active = true
    )
  )
  WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.route_drivers rd
      WHERE rd.route_id = route_stop_points.route_id
        AND rd.driver_id = auth.uid()
        AND rd.is_active = true
    )
  );

-- السائق يمكنه رؤية طلبات الرحلات في خطوطه
DROP POLICY IF EXISTS "Drivers can view their trip requests" ON public.visit_requests;
CREATE POLICY "Drivers can view their trip requests"
  ON public.visit_requests FOR SELECT
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.route_drivers rd
        JOIN public.request_dropoff_points rdp ON rdp.route_id = rd.route_id
      WHERE rdp.request_id = visit_requests.id
        AND rd.driver_id = auth.uid()
        AND rd.is_active = true
        AND visit_requests.trip_status IN ('pending_arrival', 'arrived')
    )
  );

-- السائق يمكنه تحديث موقع الرحلة الحالي
DROP POLICY IF EXISTS "Drivers can update their trip locations" ON public.trip_driver_locations;
CREATE POLICY "Drivers can update their trip locations"
  ON public.trip_driver_locations FOR ALL
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.route_drivers rd
        JOIN public.request_dropoff_points rdp ON rdp.route_id = rd.route_id
      WHERE rdp.request_id = trip_driver_locations.request_id
        AND rd.driver_id = auth.uid()
        AND rd.is_active = true
    )
  )
  WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.route_drivers rd
        JOIN public.request_dropoff_points rdp ON rdp.route_id = rd.route_id
      WHERE rdp.request_id = trip_driver_locations.request_id
        AND rd.driver_id = auth.uid()
        AND rd.is_active = true
    )
  );

-- السائق يمكنه إدارة نقاط التوقف المخصصة لرحلاته
DROP POLICY IF EXISTS "Drivers can manage their trip stops" ON public.trip_stops;
CREATE POLICY "Drivers can manage their trip stops"
  ON public.trip_stops FOR ALL
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.route_drivers rd
        JOIN public.request_dropoff_points rdp ON rdp.route_id = rd.route_id
      WHERE rdp.request_id = trip_stops.request_id
        AND rd.driver_id = auth.uid()
        AND rd.is_active = true
    )
  )
  WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.route_drivers rd
        JOIN public.request_dropoff_points rdp ON rdp.route_id = rd.route_id
      WHERE rdp.request_id = trip_stops.request_id
        AND rd.driver_id = auth.uid()
        AND rd.is_active = true
    )
  );

-- إنشاء سائق تجريبي (يمكن حذفه لاحقاً)
-- كلمة المرور: driver123
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'driver@example.com',
  crypt('driver123', gen_salt('bf')),
  now(),
  now(),
  now()
)
ON CONFLICT (email) DO NOTHING;

-- إضافة ملف شخصي للسائق التجريبي
INSERT INTO public.profiles (user_id, full_name, phone, role)
SELECT
  au.id,
  'سائق تجريبي',
  '+962777123456',
  'driver'
FROM auth.users au
WHERE au.email = 'driver@example.com'
ON CONFLICT (user_id) DO NOTHING;

-- ربط السائق التجريبي بالخط الافتراضي
INSERT INTO public.route_drivers (route_id, driver_id, is_active)
SELECT
  r.id,
  p.user_id,
  true
FROM public.routes r
CROSS JOIN public.profiles p
WHERE r.name = 'دمشق - عمان'
  AND p.role = 'driver'
  AND p.full_name = 'سائق تجريبي'
ON CONFLICT (route_id, driver_id) DO NOTHING;

