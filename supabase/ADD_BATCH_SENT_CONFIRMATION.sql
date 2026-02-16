-- إضافة حقول لتأكيد إرسال المجموعة وعرض نص الرسالة
-- Run in Supabase SQL Editor.

-- إضافة الأعمدة الجديدة لجدول invite_batches
ALTER TABLE public.invite_batches
ADD COLUMN IF NOT EXISTS confirmed_sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS confirmed_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS confirmed_sent_role text CHECK (confirmed_sent_role IN ('admin', 'supervisor')),
ADD COLUMN IF NOT EXISTS last_message_sent text;

-- إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS invite_batches_confirmed_sent_by_idx ON public.invite_batches(confirmed_sent_by);
CREATE INDEX IF NOT EXISTS invite_batches_confirmed_sent_at_idx ON public.invite_batches(confirmed_sent_at);

