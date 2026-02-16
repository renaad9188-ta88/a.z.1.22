-- إصلاح مشكلة scheduled_at في جدول invite_batches
-- Run in Supabase SQL Editor.

-- إزالة NOT NULL constraint من scheduled_at (إذا كان موجوداً)
ALTER TABLE public.invite_batches
ALTER COLUMN scheduled_at DROP NOT NULL;

-- التأكد من أن scheduled_at يمكن أن يكون NULL
DO $$ 
BEGIN
  -- التحقق من أن العمود يمكن أن يكون NULL
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'invite_batches' 
      AND column_name = 'scheduled_at'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.invite_batches
    ALTER COLUMN scheduled_at DROP NOT NULL;
  END IF;
END $$;

