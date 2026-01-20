-- Add trip_id column to visit_requests to link requests with route_trips
-- Run in Supabase SQL Editor.

-- إضافة عمود trip_id إلى visit_requests
ALTER TABLE public.visit_requests
  ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.route_trips(id) ON DELETE SET NULL;

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_visit_requests_trip_id
  ON public.visit_requests(trip_id);

-- ملاحظات:
-- 1. العمود trip_id يربط visit_request مع route_trip
-- 2. عند حذف route_trip، يتم تعيين trip_id إلى NULL (ON DELETE SET NULL)
-- 3. يمكن أن يكون trip_id NULL إذا لم يتم حجز رحلة بعد
-- 4. الفهرس يساعد في تحسين استعلامات البحث عن الركاب في رحلة محددة



