-- ============================================
-- تعيين المستخدم tamer88 كإداري
-- ============================================

-- الخطوة 1: البحث عن معرف المستخدم tamer88
-- نفذ هذا الأمر أولاً لمعرفة معرف المستخدم
SELECT id, email, created_at 
FROM auth.users 
WHERE email LIKE '%tamer88%' OR raw_user_meta_data->>'full_name' LIKE '%tamer88%';

-- ============================================
-- الخطوة 2: بعد الحصول على معرف المستخدم (id) من النتيجة أعلاه
-- استبدل 'معرف_المستخدم_من_الخطوة_1' بالمعرف الذي ظهر
-- ============================================

-- الطريقة 1: إذا كان المستخدم موجود في profiles
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = 'معرف_المستخدم_من_الخطوة_1'::uuid;

-- الطريقة 2: إذا كان المستخدم غير موجود في profiles، أنشئه
-- INSERT INTO profiles (user_id, full_name, role)
-- VALUES ('معرف_المستخدم_من_الخطوة_1'::uuid, 'tamer88', 'admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- ============================================
-- أو استخدم هذا الأمر المباشر (إذا كان email المستخدم معروف)
-- ============================================
-- استبدل 'email@example.com' ببريد المستخدم tamer88
UPDATE profiles 
SET role = 'admin' 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'email@example.com'
);

-- ============================================
-- التحقق من النجاح
-- ============================================
SELECT user_id, full_name, role, phone 
FROM profiles 
WHERE role = 'admin';



