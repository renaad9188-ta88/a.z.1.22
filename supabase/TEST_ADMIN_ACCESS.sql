-- ============================================
-- اختبار صلاحيات الإدارة للمستخدم الحالي
-- ============================================
-- نفذ هذا الملف بعد تسجيل الدخول كإداري
-- ============================================

-- 1. التحقق من المستخدم الحالي
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_email;

-- 2. التحقق من role المستخدم الحالي
SELECT 
  p.user_id,
  p.full_name,
  p.phone,
  p.role,
  u.email
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE p.user_id = auth.uid();

-- 3. اختبار الوصول إلى visit_requests
SELECT COUNT(*) as total_requests FROM visit_requests;

-- 4. اختبار الوصول إلى profiles
SELECT COUNT(*) as total_profiles FROM profiles;

-- 5. عرض أول 5 طلبات (اختبار)
SELECT 
  id,
  visitor_name,
  status,
  created_at
FROM visit_requests
ORDER BY created_at DESC
LIMIT 5;

-- 6. التحقق من السياسات الإدارية
SELECT 
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'visit_requests' 
AND policyname LIKE '%Admin%';


