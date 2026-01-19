-- ============================================
-- تعيين tamer88 كإداري (الطريقة البسيطة)
-- ============================================
-- استخدم هذا الملف إذا كان المستخدم tamer88 مسجل بالفعل
-- ============================================

-- الخطوة 1: إضافة عمود role إذا لم يكن موجوداً
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- الخطوة 2: البحث عن المستخدم أولاً
-- نفذ هذا الأمر لمعرفة إذا كان المستخدم موجود
SELECT 
  p.user_id,
  p.full_name,
  p.phone,
  p.role,
  u.email
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE 
  p.full_name LIKE '%tamer88%' 
  OR p.phone LIKE '%tamer88%'
  OR u.email LIKE '%tamer88%';

-- الخطوة 3: إذا ظهر المستخدم في النتيجة أعلاه، نفذ هذا:
UPDATE profiles 
SET role = 'admin' 
WHERE 
  full_name LIKE '%tamer88%' 
  OR phone LIKE '%tamer88%'
  OR user_id IN (
    SELECT id FROM auth.users 
    WHERE email LIKE '%tamer88%' 
    OR raw_user_meta_data->>'full_name' LIKE '%tamer88%'
  );

-- ============================================
-- إذا لم يظهر المستخدم في الخطوة 2:
-- ============================================
-- 1. سجل الدخول كـ tamer88 في الموقع أولاً
-- 2. ثم نفذ الخطوة 3 أعلاه مرة أخرى

-- ============================================
-- التحقق من النجاح
-- ============================================
SELECT 
  p.user_id,
  p.full_name,
  p.phone,
  p.role,
  u.email
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE p.role = 'admin';





