-- إضافة حقل is_active للمشرفين (تعطيل/تفعيل)
-- نفّذ هذا الملف في Supabase SQL Editor بعد تنفيذ ADD_SUPERVISOR_PERMISSIONS_SYSTEM.sql

-- 1) إضافة حقل is_active إلى supervisor_permissions
ALTER TABLE supervisor_permissions
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_supervisor_permissions_is_active ON supervisor_permissions(is_active) WHERE is_active = false;

-- 2) تحديث Helper Function للتحقق من حالة المشرف
CREATE OR REPLACE FUNCTION public.is_supervisor_active(supervisor_user_id uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM supervisor_permissions sp
    WHERE sp.supervisor_id = supervisor_user_id
      AND sp.is_active = true
  );
END;
$$;

-- 3) تحديث RLS Policies لاستثناء المشرفين المعطلين
-- ملاحظة: هذه السياسات تمنع المشرفين المعطلين من الوصول

-- تحديث سياسة visit_requests للمشرفين
DROP POLICY IF EXISTS "Supervisors can view assigned requests" ON visit_requests;
CREATE POLICY "Supervisors can view assigned requests"
  ON visit_requests FOR SELECT
  USING (
    public.is_admin()
    OR (
      public.is_supervisor()
      AND public.is_supervisor_active(auth.uid())
      AND (
        assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM supervisor_customers sc
          WHERE sc.supervisor_id = auth.uid()
            AND sc.customer_id = visit_requests.user_id
        )
        OR EXISTS (
          SELECT 1 FROM supervisor_permissions sp
          WHERE sp.supervisor_id = auth.uid()
            AND sp.can_view_all_requests = true
            AND sp.is_active = true
        )
      )
    )
    OR (auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Supervisors can update assigned requests" ON visit_requests;
CREATE POLICY "Supervisors can update assigned requests"
  ON visit_requests FOR UPDATE
  USING (
    public.is_admin()
    OR (
      public.is_supervisor()
      AND public.is_supervisor_active(auth.uid())
      AND (
        assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM supervisor_customers sc
          WHERE sc.supervisor_id = auth.uid()
            AND sc.customer_id = visit_requests.user_id
        )
        OR EXISTS (
          SELECT 1 FROM supervisor_permissions sp
          WHERE sp.supervisor_id = auth.uid()
            AND sp.can_view_all_requests = true
            AND sp.is_active = true
        )
      )
    )
    OR (auth.uid() = user_id)
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_supervisor()
      AND public.is_supervisor_active(auth.uid())
      AND (
        assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM supervisor_customers sc
          WHERE sc.supervisor_id = auth.uid()
            AND sc.customer_id = visit_requests.user_id
        )
        OR EXISTS (
          SELECT 1 FROM supervisor_permissions sp
          WHERE sp.supervisor_id = auth.uid()
            AND sp.can_view_all_requests = true
            AND sp.is_active = true
        )
      )
    )
    OR (auth.uid() = user_id)
  );

-- 4) تحديث سياسات supervisor_permissions
DROP POLICY IF EXISTS "Supervisors can view their own permissions" ON supervisor_permissions;
CREATE POLICY "Supervisors can view their own permissions"
  ON supervisor_permissions
  FOR SELECT
  USING (
    public.is_admin()
    OR (public.is_supervisor() AND supervisor_id = auth.uid())
  );

-- ملاحظات:
-- 1. المشرف المعطل (is_active = false) لن يتمكن من تسجيل الدخول إلى لوحة المشرف
-- 2. البيانات محفوظة ويمكن إعادة التفعيل في أي وقت
-- 3. الإدمن فقط يمكنه تعطيل/تفعيل المشرفين

