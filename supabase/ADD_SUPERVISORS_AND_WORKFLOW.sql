-- إضافة نظام المشرفين + تسلسل الدفع -> فتح الحجز
-- الهدف:
-- 1) إضافة role = 'supervisor' في profiles
-- 2) إضافة تعيين الطلب لمشرف: assigned_to/assigned_by/assigned_at
-- 3) إضافة بوابة "تأكيد الدفعة" لفتح الحجز: payment_verified + audit fields
-- 4) RLS: المشرف يرى/يحدث فقط الطلبات المعيّنة له
--
-- نفّذ هذا الملف في Supabase SQL Editor (على قاعدة البيانات).

-- 1) تحديث constraint للـ role في profiles لإضافة 'supervisor' (مع الحفاظ على driver)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_role_check'
      AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('user', 'admin', 'driver', 'supervisor'));
END $$;

-- 2) Helper function: is_supervisor()
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO user_role
  FROM public.profiles
  WHERE user_id = auth.uid()
  ORDER BY updated_at DESC
  LIMIT 1;

  RETURN COALESCE(user_role = 'supervisor', FALSE);
END;
$$;

-- 3) حقول التعيين + تأكيد الدفعة على visit_requests
ALTER TABLE public.visit_requests
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_visit_requests_assigned_to ON public.visit_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_visit_requests_payment_verified ON public.visit_requests(payment_verified) WHERE payment_verified = true;

-- 4) RLS Policies: supervisors for visit_requests
-- ملاحظة: السياسات الحالية للإدمن والمستخدم تبقى كما هي، نحن نضيف سياسات إضافية للمشرف.
ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supervisors can view assigned requests" ON public.visit_requests;
CREATE POLICY "Supervisors can view assigned requests"
  ON public.visit_requests FOR SELECT
  USING (
    public.is_admin()
    OR (public.is_supervisor() AND assigned_to = auth.uid())
    OR (auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Supervisors can update assigned requests" ON public.visit_requests;
CREATE POLICY "Supervisors can update assigned requests"
  ON public.visit_requests FOR UPDATE
  USING (
    public.is_admin()
    OR (public.is_supervisor() AND assigned_to = auth.uid())
    OR (auth.uid() = user_id)
  )
  WITH CHECK (
    public.is_admin()
    OR (public.is_supervisor() AND assigned_to = auth.uid())
    OR (auth.uid() = user_id)
  );

-- تلميح:
-- لترقية مستخدم إلى مشرف:
-- UPDATE public.profiles SET role = 'supervisor' WHERE user_id = '...';


