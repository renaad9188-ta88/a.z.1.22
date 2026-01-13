-- ============================================
-- إصلاح وإعداد المستخدم الإداري tamer88@gmail.com
-- ============================================
-- معرف المستخدم: 9a64545f-e376-414d-8d2c-e812ed91db5b
-- ============================================

-- الخطوة 1: إضافة عمود role إذا لم يكن موجوداً
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- الخطوة 2: إنشاء profile للمستخدم إذا لم يكن موجوداً
INSERT INTO profiles (user_id, full_name, phone, role)
VALUES ('9a64545f-e376-414d-8d2c-e812ed91db5b'::uuid, 'tamer88', 'tamer88', 'admin')
ON CONFLICT DO NOTHING;

-- الخطوة 3: تحديث role إذا كان profile موجود بالفعل
UPDATE profiles 
SET role = 'admin', full_name = 'tamer88', phone = 'tamer88'
WHERE user_id = '9a64545f-e376-414d-8d2c-e812ed91db5b'::uuid;

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
WHERE u.email = 'tamer88@gmail.com';

-- ============================================
-- التحقق من جميع الإداريين
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
