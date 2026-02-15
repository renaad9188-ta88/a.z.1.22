-- نظام صلاحيات متقدم للمشرفين
-- الهدف:
-- 1) إضافة جداول للصلاحيات والمنتسبين والدعوات
-- 2) تحديث RLS policies بناءً على الصلاحيات
-- 3) نظام مناديب: كل مشرف له منتسبينه
--
-- نفّذ هذا الملف في Supabase SQL Editor

-- 1) جدول صلاحيات المشرفين
CREATE TABLE IF NOT EXISTS supervisor_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  can_manage_routes boolean NOT NULL DEFAULT false,
  can_create_trips boolean NOT NULL DEFAULT false,
  can_assign_requests boolean NOT NULL DEFAULT false,
  can_verify_payments boolean NOT NULL DEFAULT true,
  can_view_all_requests boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(supervisor_id)
);

CREATE INDEX IF NOT EXISTS idx_supervisor_permissions_supervisor_id ON supervisor_permissions(supervisor_id);

-- 2) جدول ربط المستخدمين بالمشرفين (نظام المناديب)
CREATE TABLE IF NOT EXISTS supervisor_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(supervisor_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_supervisor_customers_supervisor_id ON supervisor_customers(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_customers_customer_id ON supervisor_customers(customer_id);

-- 3) جدول ربط الدعوات بالمشرفين (إذا كان جدول invites موجود)
-- ملاحظة: إذا لم يكن جدول invites موجود، يمكن تخطي هذا القسم
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invites') THEN
    CREATE TABLE IF NOT EXISTS supervisor_invites (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      supervisor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      invite_id uuid REFERENCES invites(id) ON DELETE CASCADE,
      assigned_at timestamptz DEFAULT now(),
      UNIQUE(supervisor_id, invite_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_supervisor_invites_supervisor_id ON supervisor_invites(supervisor_id);
    CREATE INDEX IF NOT EXISTS idx_supervisor_invites_invite_id ON supervisor_invites(invite_id);
  END IF;
END $$;

-- 4) Helper Functions
CREATE OR REPLACE FUNCTION public.get_supervisor_permissions(supervisor_user_id uuid)
RETURNS TABLE (
  can_manage_routes boolean,
  can_create_trips boolean,
  can_assign_requests boolean,
  can_verify_payments boolean,
  can_view_all_requests boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(sp.can_manage_routes, false),
    COALESCE(sp.can_create_trips, false),
    COALESCE(sp.can_assign_requests, false),
    COALESCE(sp.can_verify_payments, true),
    COALESCE(sp.can_view_all_requests, false)
  FROM supervisor_permissions sp
  WHERE sp.supervisor_id = supervisor_user_id
  LIMIT 1;
  
  -- إذا لم توجد صلاحيات، إرجاع القيم الافتراضية
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, false, true, false;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor_customer(supervisor_user_id uuid, customer_user_id uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM supervisor_customers
    WHERE supervisor_id = supervisor_user_id
      AND customer_id = customer_user_id
  );
END;
$$;

-- 5) RLS Policies للمشرفين

-- supervisor_permissions: الإدمن فقط يمكنه إدارة الصلاحيات
ALTER TABLE supervisor_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage supervisor permissions" ON supervisor_permissions;
CREATE POLICY "Admins can manage supervisor permissions"
  ON supervisor_permissions
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Supervisors can view their own permissions" ON supervisor_permissions;
CREATE POLICY "Supervisors can view their own permissions"
  ON supervisor_permissions
  FOR SELECT
  USING (
    public.is_admin()
    OR (public.is_supervisor() AND supervisor_id = auth.uid())
  );

-- supervisor_customers: الإدمن والمشرف يمكنهما إدارة المنتسبين
ALTER TABLE supervisor_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all supervisor customers" ON supervisor_customers;
CREATE POLICY "Admins can manage all supervisor customers"
  ON supervisor_customers
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Supervisors can view their own customers" ON supervisor_customers;
CREATE POLICY "Supervisors can view their own customers"
  ON supervisor_customers
  FOR SELECT
  USING (
    public.is_admin()
    OR (public.is_supervisor() AND supervisor_id = auth.uid())
  );

-- supervisor_invites: إذا كان الجدول موجود
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supervisor_invites') THEN
    ALTER TABLE supervisor_invites ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Admins can manage supervisor invites" ON supervisor_invites;
    CREATE POLICY "Admins can manage supervisor invites"
      ON supervisor_invites
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
    
    DROP POLICY IF EXISTS "Supervisors can view their own invites" ON supervisor_invites;
    CREATE POLICY "Supervisors can view their own invites"
      ON supervisor_invites
      FOR SELECT
      USING (
        public.is_admin()
        OR (public.is_supervisor() AND supervisor_id = auth.uid())
      );
  END IF;
END $$;

-- 6) تحديث RLS policies لـ visit_requests للمشرفين
-- المشرف يرى:
-- - الطلبات المعينة له (assigned_to)
-- - طلبات منتسبيه (إذا كان customer_id في supervisor_customers)
-- - جميع الطلبات (إذا كان can_view_all_requests = true)

DROP POLICY IF EXISTS "Supervisors can view assigned requests" ON visit_requests;
CREATE POLICY "Supervisors can view assigned requests"
  ON visit_requests FOR SELECT
  USING (
    public.is_admin()
    OR (
      public.is_supervisor()
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
        )
      )
    )
    OR (auth.uid() = user_id)
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_supervisor()
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
        )
      )
    )
    OR (auth.uid() = user_id)
  );

-- 7) Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_supervisor_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_supervisor_permissions_updated_at ON supervisor_permissions;
CREATE TRIGGER trigger_update_supervisor_permissions_updated_at
  BEFORE UPDATE ON supervisor_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_supervisor_permissions_updated_at();

-- ملاحظات:
-- 1. بعد تنفيذ هذا الملف، يجب إنشاء صلاحيات لكل مشرف في supervisor_permissions
-- 2. ربط المنتسبين بالمشرفين في supervisor_customers
-- 3. الإدمن يمكنه إدارة كل شيء من واجهة SupervisorsManagement

