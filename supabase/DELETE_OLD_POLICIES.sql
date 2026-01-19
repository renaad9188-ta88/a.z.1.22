-- ============================================
-- ملف حذف السياسات القديمة فقط
-- استخدم هذا الملف إذا أردت حذف السياسات القديمة فقط
-- ============================================

-- حذف سياسات visit_requests
DROP POLICY IF EXISTS "Admins can view all requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON visit_requests;

-- حذف سياسات profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- ملاحظة: بعد حذف هذه السياسات، نفذ ملف migration_admin_step_by_step.sql
-- لإضافة السياسات الجديدة





