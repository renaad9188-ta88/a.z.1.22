-- إصلاح constraint لـ trip_status
-- يجب تنفيذ هذا السكريبت في Supabase SQL Editor

-- حذف constraint القديم إن وجد
ALTER TABLE visit_requests 
DROP CONSTRAINT IF EXISTS visit_requests_trip_status_check;

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

-- التأكد من أن القيمة الافتراضية موجودة
ALTER TABLE visit_requests 
ALTER COLUMN trip_status SET DEFAULT 'pending_arrival';

