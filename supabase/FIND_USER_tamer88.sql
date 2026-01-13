-- ============================================
-- البحث عن المستخدم tamer88
-- ============================================
-- نفذ هذا الأمر أولاً للعثور على معرف المستخدم
-- ============================================

-- البحث في جدول auth.users
SELECT 
  id as user_id,
  email,
  created_at,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'phone' as phone
FROM auth.users 
WHERE 
  email LIKE '%tamer88%' 
  OR raw_user_meta_data->>'full_name' LIKE '%tamer88%'
  OR raw_user_meta_data->>'phone' LIKE '%tamer88%';

-- ============================================
-- البحث في جدول profiles
-- ============================================
SELECT 
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
-- بعد الحصول على user_id من النتائج أعلاه
-- استخدمه في ملف SET_ADMIN_tamer88.sql
-- ============================================


