-- إضافة حقول تأكيد الإرسال اليدوي
-- Run in Supabase SQL Editor.

-- إضافة الأعمدة الجديدة لجدول invites
ALTER TABLE public.invites
ADD COLUMN IF NOT EXISTS manually_confirmed_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS confirmed_sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS confirmed_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS confirmed_sent_role text CHECK (confirmed_sent_role IN ('admin', 'supervisor'));

-- إنشاء فهرس
CREATE INDEX IF NOT EXISTS invites_manually_confirmed_sent_idx ON public.invites(manually_confirmed_sent);
CREATE INDEX IF NOT EXISTS invites_confirmed_sent_by_idx ON public.invites(confirmed_sent_by);

