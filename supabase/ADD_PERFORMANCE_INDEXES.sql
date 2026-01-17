-- فهارس لتحسين أداء الاستعلامات
-- هدفها: تسريع البحث والفلترة في الجداول الكبيرة

-- فهارس موجودة بالفعل (من schema.sql):
-- idx_profiles_user_id
-- idx_visit_requests_user_id
-- idx_visit_requests_status
-- idx_bookings_user_id
-- idx_bookings_request_id
-- idx_drivers_is_active

-- فهارس إضافية لتحسين الأداء:

-- 1) فهرس مركب للطلبات (user_id + status) - مفيد للداشبورد
CREATE INDEX IF NOT EXISTS idx_visit_requests_user_status 
ON public.visit_requests(user_id, status);

-- 2) فهرس للتاريخ (مفيد للفلترة حسب التاريخ)
CREATE INDEX IF NOT EXISTS idx_visit_requests_created_at_desc 
ON public.visit_requests(created_at DESC);

-- 3) فهرس للتاريخ + الحالة (مفيد للإحصائيات)
CREATE INDEX IF NOT EXISTS idx_visit_requests_status_created 
ON public.visit_requests(status, created_at DESC);

-- 4) فهرس لـ trip_status (مفيد للفلترة حسب حالة الرحلة)
CREATE INDEX IF NOT EXISTS idx_visit_requests_trip_status 
ON public.visit_requests(trip_status) 
WHERE trip_status IS NOT NULL;

-- 5) فهرس للتاريخ + trip_status (مفيد للقادمين/المغادرين)
CREATE INDEX IF NOT EXISTS idx_visit_requests_arrival_date 
ON public.visit_requests(arrival_date) 
WHERE arrival_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visit_requests_departure_date 
ON public.visit_requests(departure_date) 
WHERE departure_date IS NOT NULL;

-- 6) فهرس للإشعارات (user_id + is_read + created_at)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON public.notifications(user_id, is_read, created_at DESC);

-- 7) فهرس لـ trip_stops (request_id + order_index)
CREATE INDEX IF NOT EXISTS idx_trip_stops_request_order 
ON public.trip_stops(request_id, order_index);

-- 8) فهرس لـ trip_driver_locations (request_id + updated_at)
CREATE INDEX IF NOT EXISTS idx_trip_driver_locations_request_updated 
ON public.trip_driver_locations(request_id, updated_at DESC);

-- ملاحظات:
-- - الفهارس الجزئية (WHERE) تستخدم مساحة أقل وتكون أسرع
-- - الفهارس المركبة مفيدة للاستعلامات التي تستخدم عدة أعمدة
-- - بعد إضافة الفهارس، قد تحتاج إلى VACUUM ANALYZE لتحديث الإحصائيات


