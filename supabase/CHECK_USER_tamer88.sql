-- ============================================
-- التحقق من وجود المستخدم tamer88
-- ============================================
-- نفذ هذا الملف أولاً للتحقق من وجود المستخدم
-- ============================================

-- البحث في auth.users
SELECT 
  'auth.users' as source,
  id as user_id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'phone' as phone,
  created_at
FROM auth.users 
WHERE 
  email LIKE '%tamer88%' 
  OR raw_user_meta_data->>'full_name' LIKE '%tamer88%'
  OR raw_user_meta_data->>'phone' LIKE '%tamer88%';

-- البحث في profiles
SELECT 
  'profiles' as source,
  user_id,
  full_name,
  phone,
  role,
  created_at
FROM profiles 
WHERE 
  full_name LIKE '%tamer88%' 
  OR phone LIKE '%tamer88%';

-- ============================================
-- إذا لم يظهر أي نتائج:
-- ============================================
-- 1. سجل الدخول في الموقع كـ tamer88 أولاً
-- 2. هذا سينشئ المستخدم تلقائياً في auth.users و profiles
-- 3. ثم نفذ ملف SET_ADMIN_tamer88_SIMPLE.sql


