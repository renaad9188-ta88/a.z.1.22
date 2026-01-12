-- Migration: تبسيط جدول visit_requests
-- هذا الملف يضيف حقل departure_city ويجعل الحقول الأخرى اختيارية

-- إضافة حقل departure_city
ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS departure_city TEXT;

-- جعل الحقول الاختيارية (إذا لم تكن موجودة بالفعل)
-- ملاحظة: إذا كانت الحقول مطلوبة (NOT NULL)، يجب تعديلها أولاً

-- تحديث الحقول لتكون اختيارية (إذا كانت موجودة)
DO $$ 
BEGIN
  -- جعل nationality اختياري
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visit_requests' 
    AND column_name = 'nationality' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE visit_requests ALTER COLUMN nationality DROP NOT NULL;
  END IF;

  -- جعل passport_number اختياري
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visit_requests' 
    AND column_name = 'passport_number' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE visit_requests ALTER COLUMN passport_number DROP NOT NULL;
  END IF;

  -- جعل passport_expiry اختياري
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visit_requests' 
    AND column_name = 'passport_expiry' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE visit_requests ALTER COLUMN passport_expiry DROP NOT NULL;
  END IF;

  -- جعل visit_type اختياري
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visit_requests' 
    AND column_name = 'visit_type' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE visit_requests ALTER COLUMN visit_type DROP NOT NULL;
  END IF;

  -- جعل travel_date اختياري
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visit_requests' 
    AND column_name = 'travel_date' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE visit_requests ALTER COLUMN travel_date DROP NOT NULL;
  END IF;

  -- جعل days_count اختياري
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visit_requests' 
    AND column_name = 'days_count' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE visit_requests ALTER COLUMN days_count DROP NOT NULL;
  END IF;

  -- جعل city اختياري
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visit_requests' 
    AND column_name = 'city' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE visit_requests ALTER COLUMN city DROP NOT NULL;
  END IF;
END $$;

-- ملاحظة: يمكنك تشغيل هذا الملف في Supabase SQL Editor
-- أو استخدام Supabase CLI: supabase db push

