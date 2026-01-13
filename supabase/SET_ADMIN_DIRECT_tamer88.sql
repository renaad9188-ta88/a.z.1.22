-- ============================================
-- تعيين tamer88 كإداري (طريقة مباشرة - محدثة)
-- ============================================
-- هذا الملف يبحث عن المستخدم ويعينه كإداري مباشرة
-- ============================================

-- الخطوة 1: إضافة عمود role إذا لم يكن موجوداً
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- الخطوة 2: البحث عن المستخدم tamer88 في auth.users
-- هذا سيعرض معرف المستخدم إذا كان موجوداً
SELECT 
  id as user_id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'phone' as phone
FROM auth.users 
WHERE 
  email LIKE '%tamer88%' 
  OR raw_user_meta_data->>'full_name' LIKE '%tamer88%'
  OR raw_user_meta_data->>'phone' LIKE '%tamer88%';

-- الخطوة 3: تعيين المستخدم الموجود في profiles كإداري
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

-- الخطوة 4: إذا كان المستخدم موجود في auth.users لكن غير موجود في profiles
-- استخدم هذا الأمر بعد الحصول على user_id من الخطوة 2
-- استبدل 'معرف_المستخدم_هنا' بالمعرف من الخطوة 2

-- الطريقة 1: إذا كان user_id هو PRIMARY KEY في profiles
INSERT INTO profiles (user_id, full_name, role)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', 'tamer88'),
  'admin'
FROM auth.users 
WHERE 
  (email LIKE '%tamer88%' OR raw_user_meta_data->>'full_name' LIKE '%tamer88%')
  AND id NOT IN (SELECT user_id FROM profiles WHERE user_id IS NOT NULL);

-- الطريقة 2: إذا لم تنجح الطريقة 1، استخدم هذا (مع معرف المستخدم المحدد)
-- INSERT INTO profiles (user_id, full_name, role)
-- VALUES ('معرف_المستخدم_هنا'::uuid, 'tamer88', 'admin');

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
