-- Add stop point selection fields to visit_requests
-- Run in Supabase SQL Editor.

-- إضافة حقول اختيار نقطة النزول/التحميل
ALTER TABLE public.visit_requests
  ADD COLUMN IF NOT EXISTS selected_dropoff_stop_id uuid REFERENCES public.route_trip_stop_points(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selected_pickup_stop_id uuid REFERENCES public.route_trip_stop_points(id) ON DELETE SET NULL;

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_visit_requests_dropoff_stop
  ON public.visit_requests(selected_dropoff_stop_id);

CREATE INDEX IF NOT EXISTS idx_visit_requests_pickup_stop
  ON public.visit_requests(selected_pickup_stop_id);

-- ملاحظات:
-- 1. selected_dropoff_stop_id: نقطة النزول للقادمون (arrival trips)
-- 2. selected_pickup_stop_id: نقطة التحميل للمغادرون (departure trips)
-- 3. عند حذف route_trip_stop_points، يتم تعيين القيم إلى NULL
-- 4. الحقول اختيارية (NULL) - المستخدم قد لا يختار نقطة


