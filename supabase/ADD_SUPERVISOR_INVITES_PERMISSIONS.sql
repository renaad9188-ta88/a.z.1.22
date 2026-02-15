-- السماح للمشرفين بإدارة الدعوات
-- نفّذ هذا الملف في Supabase SQL Editor

-- 1) تحديث RLS Policy للسماح للمشرفين بإدارة الدعوات
DROP POLICY IF EXISTS "Admins manage invites" ON public.invites;
CREATE POLICY "Admins and supervisors can manage invites"
  ON public.invites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND lower(coalesce(p.role, 'user')) IN ('admin', 'supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND lower(coalesce(p.role, 'user')) IN ('admin', 'supervisor')
    )
  );

-- 2) تحديث RLS Policy للمشرفين لعرض دعواتهم فقط
DROP POLICY IF EXISTS "Supervisors can view their own invites" ON supervisor_invites;
CREATE POLICY "Supervisors can view their own invites"
  ON supervisor_invites
  FOR SELECT
  USING (
    public.is_admin()
    OR (public.is_supervisor() AND supervisor_id = auth.uid())
  );

-- 3) السماح للمشرفين بإضافة دعوات إلى supervisor_invites
DROP POLICY IF EXISTS "Supervisors can add their own invites" ON supervisor_invites;
CREATE POLICY "Supervisors can add their own invites"
  ON supervisor_invites
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (public.is_supervisor() AND supervisor_id = auth.uid())
  );

-- 4) السماح للمشرفين بحذف دعواتهم
DROP POLICY IF EXISTS "Supervisors can delete their own invites" ON supervisor_invites;
CREATE POLICY "Supervisors can delete their own invites"
  ON supervisor_invites
  FOR DELETE
  USING (
    public.is_admin()
    OR (public.is_supervisor() AND supervisor_id = auth.uid())
  );

-- ملاحظات:
-- 1. المشرف يستطيع إضافة دعوات جديدة في جدول invites
-- 2. المشرف يستطيع ربط الدعوات بنفسه في supervisor_invites
-- 3. المشرف يرى فقط الدعوات المرتبطة به
-- 4. الإدمن يرى جميع الدعوات

