-- نظام المجموعات للدعوات (Batches System)
-- Run in Supabase SQL Editor.

-- تفعيل extension للـ UUID (إذا لم يكن مفعلاً)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) إنشاء جدول invite_batches أولاً (قبل إضافة Foreign Key)
CREATE TABLE IF NOT EXISTS public.invite_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_at timestamptz,
  sent_at timestamptz,
  total_count integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  joined_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- إضافة الأعمدة الجديدة إذا لم تكن موجودة
ALTER TABLE public.invite_batches
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- تحديث name للأرقام الموجودة إذا كانت NULL
UPDATE public.invite_batches
SET name = 'مجموعة ' || substring(id::text, 1, 8)
WHERE name IS NULL;

-- 2) إضافة أعمدة جديدة لجدول invites (بعد إنشاء invite_batches)
ALTER TABLE public.invites 
ADD COLUMN IF NOT EXISTS batch_id uuid,
ADD COLUMN IF NOT EXISTS batch_scheduled_at timestamptz,
ADD COLUMN IF NOT EXISTS batch_sent_at timestamptz;

-- إضافة Foreign Key constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'invites_batch_id_fkey'
  ) THEN
    ALTER TABLE public.invites
    ADD CONSTRAINT invites_batch_id_fkey 
    FOREIGN KEY (batch_id) 
    REFERENCES public.invite_batches(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- 3) إنشاء فهرس للمجموعات
CREATE INDEX IF NOT EXISTS invites_batch_id_idx ON public.invites(batch_id);
CREATE INDEX IF NOT EXISTS invites_batch_scheduled_at_idx ON public.invites(batch_scheduled_at);

CREATE INDEX IF NOT EXISTS invite_batches_name_idx ON public.invite_batches(name);
CREATE INDEX IF NOT EXISTS invite_batches_scheduled_at_idx ON public.invite_batches(scheduled_at);
CREATE INDEX IF NOT EXISTS invite_batches_sent_at_idx ON public.invite_batches(sent_at);
CREATE INDEX IF NOT EXISTS invite_batches_created_by_idx ON public.invite_batches(created_by);

ALTER TABLE public.invite_batches ENABLE ROW LEVEL SECURITY;

-- 4) Policies للمجموعات (admin only)
DROP POLICY IF EXISTS "Admins manage batches" ON public.invite_batches;
CREATE POLICY "Admins manage batches"
  ON public.invite_batches
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND lower(coalesce(p.role, 'user')) = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND lower(coalesce(p.role, 'user')) = 'admin'
    )
  );

