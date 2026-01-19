-- ============================================
-- التحقق من حالة RLS والسياسات
-- ============================================

-- التحقق من تفعيل RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('profiles', 'visit_requests');

-- عرض جميع السياسات
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename IN ('profiles', 'visit_requests')
ORDER BY tablename, policyname;

-- التحقق من المستخدمين الإداريين
SELECT 
  user_id,
  full_name,
  phone,
  role
FROM profiles 
WHERE role = 'admin';





