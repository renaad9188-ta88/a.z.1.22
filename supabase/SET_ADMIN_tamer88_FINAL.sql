-- ============================================
-- تعيين tamer88 كإداري (باستخدام معرف المستخدم الفعلي)
-- ============================================
-- معرف المستخدم: bafe4bea-9f8f-4097-9b9b-3ff06ca568dc
-- ============================================

-- الخطوة 1: إضافة عمود role إذا لم يكن موجوداً
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- الخطوة 2: إنشاء profile وتعيينه كإداري
INSERT INTO profiles (user_id, full_name, phone, role)
VALUES ('bafe4bea-9f8f-4097-9b9b-3ff06ca568dc'::uuid, 'tamer88', 'tamer88', 'admin')
ON CONFLICT DO NOTHING;

-- الخطوة 3: تحديث role إذا كان profile موجود بالفعل
UPDATE profiles 
SET role = 'admin', full_name = 'tamer88', phone = 'tamer88'
WHERE user_id = 'bafe4bea-9f8f-4097-9b9b-3ff06ca568dc'::uuid;

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
WHERE p.user_id = 'bafe4bea-9f8f-4097-9b9b-3ff06ca568dc'::uuid;

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




