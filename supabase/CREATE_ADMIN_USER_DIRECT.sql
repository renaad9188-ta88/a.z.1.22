-- ============================================
-- إنشاء مستخدم إداري مباشرة في Supabase
-- ============================================
-- هذا الملف ينشئ مستخدم إداري مباشرة بدون الحاجة للتسجيل من الموقع
-- ============================================

-- الخطوة 1: إنشاء مستخدم في auth.users
-- استبدل القيم التالية:
-- 'tamer88' - اسم المستخدم
-- 'phone_tamer88@maidaa.local' - رقم هاتف (سيتم تحويله إلى email)
-- '963XXXXXXXXX' - رقم الهاتف الفعلي

-- ملاحظة: في Supabase، يجب استخدام Supabase Dashboard > Authentication > Users > Add User
-- أو استخدام Supabase Admin API

-- ============================================
-- الطريقة 1: استخدام Supabase Dashboard (الأسهل)
-- ============================================
-- 1. اذهب إلى Supabase Dashboard
-- 2. Authentication > Users
-- 3. Add User > Create new user
-- 4. Email: phone_tamer88@maidaa.local
-- 5. Password: (اختر كلمة مرور)
-- 6. User Metadata: 
--    {
--      "full_name": "tamer88",
--      "phone": "963XXXXXXXXX"
--    }
-- 7. اضغط Create user

-- ============================================
-- الطريقة 2: بعد إنشاء المستخدم في auth.users
-- ============================================
-- نفذ هذا الأمر لإنشاء profile وتعيينه كإداري
-- (استبدل 'USER_ID_FROM_AUTH_USERS' بمعرف المستخدم من auth.users)

-- إضافة عمود role
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- إنشاء profile وتعيينه كإداري
INSERT INTO profiles (user_id, full_name, phone, role)
VALUES (
  'USER_ID_FROM_AUTH_USERS'::uuid,
  'tamer88',
  '963XXXXXXXXX',
  'admin'
)
ON CONFLICT DO NOTHING;

-- إذا كان profile موجود بالفعل، قم بتحديثه
UPDATE profiles 
SET role = 'admin', full_name = 'tamer88'
WHERE user_id = 'USER_ID_FROM_AUTH_USERS'::uuid;

-- ============================================
-- الطريقة 3: البحث عن المستخدم وإنشائه إذا لم يكن موجوداً
-- ============================================
-- هذا الأمر يبحث عن المستخدم في auth.users ويعينه كإداري

-- إضافة عمود role
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- البحث عن المستخدم وإنشاء profile له
INSERT INTO profiles (user_id, full_name, phone, role)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', 'tamer88'),
  COALESCE(raw_user_meta_data->>'phone', '963XXXXXXXXX'),
  'admin'
FROM auth.users 
WHERE email LIKE '%tamer88%' OR raw_user_meta_data->>'full_name' LIKE '%tamer88%'
ON CONFLICT DO NOTHING;

-- تحديث role للمستخدمين الموجودين
UPDATE profiles 
SET role = 'admin'
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%tamer88%' OR raw_user_meta_data->>'full_name' LIKE '%tamer88%'
);

-- ============================================
-- التحقق من النجاح
-- ============================================
SELECT 
  p.user_id,
  p.full_name,
  p.phone,
  p.role,
  u.email,
  u.raw_user_meta_data
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE p.role = 'admin';





