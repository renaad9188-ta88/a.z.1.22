-- إضافة حقول جديدة لحجز مواعيد الرحلة
-- يجب تنفيذ هذا السكريبت في Supabase SQL Editor

-- حذف constraint القديم إن وجد
ALTER TABLE visit_requests 
DROP CONSTRAINT IF EXISTS visit_requests_trip_status_check;

-- إضافة الحقول الجديدة
ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS arrival_date DATE,
ADD COLUMN IF NOT EXISTS departure_date DATE,
ADD COLUMN IF NOT EXISTS trip_status TEXT DEFAULT 'pending_arrival';

-- تحديث القيم null إلى القيمة الافتراضية
UPDATE visit_requests 
SET trip_status = 'pending_arrival' 
WHERE trip_status IS NULL;

-- إضافة constraint جديد يسمح بـ null والقيم المطلوبة
ALTER TABLE visit_requests 
ADD CONSTRAINT visit_requests_trip_status_check 
CHECK (
  trip_status IS NULL 
  OR trip_status IN (
    'pending_arrival', 
    'scheduled_pending_approval', 
    'arrived', 
    'completed'
  )
);

-- تحديث constraint للحالة لتشمل 'completed'
ALTER TABLE visit_requests 
DROP CONSTRAINT IF EXISTS visit_requests_status_check;

ALTER TABLE visit_requests 
ADD CONSTRAINT visit_requests_status_check 
CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'completed'));

-- إنشاء index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_visit_requests_trip_status ON visit_requests(trip_status);
CREATE INDEX IF NOT EXISTS idx_visit_requests_arrival_date ON visit_requests(arrival_date);
CREATE INDEX IF NOT EXISTS idx_visit_requests_departure_date ON visit_requests(departure_date);

-- دالة لتحديث حالة الطلب تلقائياً بعد المغادرة
CREATE OR REPLACE FUNCTION update_trip_status_after_departure()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- تحديث الطلبات التي انتهت مدة الإقامة (شهر من القدوم)
  UPDATE visit_requests
  SET 
    trip_status = 'completed',
    status = 'completed',
    updated_at = NOW()
  WHERE 
    trip_status = 'arrived'
    AND departure_date IS NOT NULL
    AND departure_date < CURRENT_DATE;
END;
$$;

-- ملاحظة: يمكن تشغيل هذه الدالة يومياً عبر cron job أو يدوياً
-- SELECT update_trip_status_after_departure();

