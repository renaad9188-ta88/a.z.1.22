-- ============================================
-- تشخيص مشكلة الوصول الإداري
-- ============================================
-- نفذ هذا الملف بعد تسجيل الدخول كإداري
-- ============================================

-- 1. التحقق من المستخدم الحالي و role
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_email,
  p.role,
  p.full_name
FROM profiles p
WHERE p.user_id = auth.uid();

-- 2. اختبار الوصول إلى visit_requests (يجب أن يعمل)
SELECT COUNT(*) as total_requests FROM visit_requests;

-- 3. اختبار الوصول إلى profiles (يجب أن يعمل)
SELECT COUNT(*) as total_profiles FROM profiles;

-- 4. عرض أول 3 طلبات (اختبار)
SELECT 
  id,
  visitor_name,
  status,
  created_at
FROM visit_requests
ORDER BY created_at DESC
LIMIT 3;

-- 5. التحقق من السياسات الإدارية
SELECT 
  tablename,
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies 
WHERE tablename IN ('profiles', 'visit_requests')
AND policyname LIKE '%Admin%'
ORDER BY tablename, policyname;

-- 6. التحقق من أن المستخدم tamer88@gmail.com إداري
SELECT 
  p.user_id,
  p.full_name,
  p.phone,
  p.role,
  u.email
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'tamer88@gmail.com';



