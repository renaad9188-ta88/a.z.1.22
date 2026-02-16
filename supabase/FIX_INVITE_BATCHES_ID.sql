-- إصلاح مشكلة id في جدول invite_batches
-- Run in Supabase SQL Editor.

-- تفعيل extension للـ UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- تحديث DEFAULT constraint للـ id
ALTER TABLE public.invite_batches
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- إذا كان الجدول موجوداً بدون DEFAULT، أضف DEFAULT
DO $$ 
BEGIN
  -- التحقق من وجود DEFAULT constraint
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'invite_batches' 
      AND column_name = 'id'
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE public.invite_batches
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

