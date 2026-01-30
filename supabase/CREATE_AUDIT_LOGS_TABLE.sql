-- إنشاء جدول لتتبع التغييرات المهمة (Audit Logs)
-- Run in Supabase SQL Editor

-- إنشاء جدول audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'trip_created', 'trip_updated', 'trip_deleted', 'booking_created', 'booking_updated', 'status_changed', 'driver_assigned', etc.
  entity_type TEXT NOT NULL, -- 'trip', 'request', 'driver', 'route', etc.
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);

-- RLS: فقط الإدمن يمكنه رؤية الـ logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- السماح للجميع بإنشاء logs (سيتم التحكم في الكود)
DROP POLICY IF EXISTS "Anyone can create audit logs" ON public.audit_logs;
CREATE POLICY "Anyone can create audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- Function مساعدة لتسجيل التغييرات
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
BEGIN
  -- الحصول على user_id الحالي
  v_user_id := auth.uid();
  
  -- إدراج السجل
  INSERT INTO public.audit_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    old_values,
    new_values,
    description
  ) VALUES (
    v_user_id,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values,
    p_description
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- تعليق على الجدول
COMMENT ON TABLE public.audit_logs IS 'جدول لتتبع التغييرات المهمة في النظام';
COMMENT ON COLUMN public.audit_logs.action_type IS 'نوع العملية: trip_created, trip_updated, booking_created, status_changed, etc.';
COMMENT ON COLUMN public.audit_logs.entity_type IS 'نوع الكيان: trip, request, driver, route, etc.';
COMMENT ON COLUMN public.audit_logs.entity_id IS 'معرف الكيان الذي تم تعديله';
COMMENT ON COLUMN public.audit_logs.old_values IS 'القيم القديمة (JSON)';
COMMENT ON COLUMN public.audit_logs.new_values IS 'القيم الجديدة (JSON)';

