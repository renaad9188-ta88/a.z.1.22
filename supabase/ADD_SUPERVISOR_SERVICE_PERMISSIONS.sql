-- نظام صلاحيات الخدمات للمشرفين
-- الهدف: ربط المشرفين بخدمات محددة (فيز، مقابلة السفارة، جوته، إلخ)
-- نفّذ هذا الملف في Supabase SQL Editor بعد تنفيذ ADD_SUPERVISOR_PERMISSIONS_SYSTEM.sql

-- 1) جدول ربط المشرفين بالخدمات
CREATE TABLE IF NOT EXISTS supervisor_service_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type text NOT NULL, -- 'visit', 'umrah', 'tourism', 'goethe', 'embassy', 'visa'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(supervisor_id, service_type)
);

CREATE INDEX IF NOT EXISTS idx_supervisor_service_permissions_supervisor_id ON supervisor_service_permissions(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_service_permissions_service_type ON supervisor_service_permissions(service_type);

-- 2) Helper Function للبحث عن المشرف المخصص لخدمة معينة
CREATE OR REPLACE FUNCTION public.get_supervisor_for_service(service_type_param text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  supervisor_user_id uuid;
BEGIN
  -- البحث عن أول مشرف نشط له صلاحية هذه الخدمة
  SELECT ssp.supervisor_id INTO supervisor_user_id
  FROM supervisor_service_permissions ssp
  INNER JOIN supervisor_permissions sp ON sp.supervisor_id = ssp.supervisor_id
  WHERE ssp.service_type = service_type_param
    AND sp.is_active = true
  ORDER BY ssp.created_at ASC
  LIMIT 1;
  
  RETURN supervisor_user_id;
END;
$$;

-- 3) Helper Function للتحقق من صلاحية المشرف على خدمة معينة
CREATE OR REPLACE FUNCTION public.supervisor_has_service_permission(supervisor_user_id uuid, service_type_param text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM supervisor_service_permissions ssp
    INNER JOIN supervisor_permissions sp ON sp.supervisor_id = ssp.supervisor_id
    WHERE ssp.supervisor_id = supervisor_user_id
      AND ssp.service_type = service_type_param
      AND sp.is_active = true
  );
END;
$$;

-- 4) RLS Policies
ALTER TABLE supervisor_service_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage supervisor service permissions" ON supervisor_service_permissions;
CREATE POLICY "Admins can manage supervisor service permissions"
  ON supervisor_service_permissions
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Supervisors can view their own service permissions" ON supervisor_service_permissions;
CREATE POLICY "Supervisors can view their own service permissions"
  ON supervisor_service_permissions
  FOR SELECT
  USING (
    public.is_admin()
    OR (public.is_supervisor() AND supervisor_id = auth.uid())
  );

-- 5) Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_supervisor_service_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_supervisor_service_permissions_updated_at ON supervisor_service_permissions;
CREATE TRIGGER trigger_update_supervisor_service_permissions_updated_at
  BEFORE UPDATE ON supervisor_service_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_supervisor_service_permissions_updated_at();

-- ملاحظات:
-- 1. الإدمن يمكنه ربط المشرف بخدمات محددة
-- 2. عند إنشاء طلب جديد، سيتم البحث عن المشرف المخصص تلقائياً
-- 3. المشرف يرى فقط الطلبات الخاصة بالخدمات المخصصة له
-- 4. الإدمن يمكنه تحويل الطلب لمشرف آخر في أي وقت

