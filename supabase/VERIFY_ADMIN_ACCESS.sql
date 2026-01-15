-- ============================================
-- التحقق من صلاحيات الإدارة
-- ============================================
-- نفذ هذا الملف للتحقق من أن السياسات تعمل بشكل صحيح
-- ============================================

-- 1. التحقق من المستخدمين الإداريين
SELECT 
  p.user_id,
  p.full_name,
  p.phone,
  p.role,
  u.email
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE p.role = 'admin';

-- 2. التحقق من السياسات الموجودة
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command
FROM pg_policies 
WHERE tablename IN ('profiles', 'visit_requests')
ORDER BY tablename, policyname;

-- 3. التحقق من تفعيل RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('profiles', 'visit_requests');

-- 4. اختبار الوصول (استبدل 'USER_ID_HERE' بمعرف المستخدم الإداري)
-- SELECT * FROM visit_requests LIMIT 5;
-- SELECT * FROM profiles WHERE role = 'admin';



