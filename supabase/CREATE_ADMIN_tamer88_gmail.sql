-- ============================================
-- إنشاء مستخدم إداري جديد
-- ============================================
-- الإيميل: tamer88@gmail.com
-- كلمة المرور: 123456123
-- ============================================
-- 
-- ملاحظة: يجب إنشاء المستخدم من Supabase Dashboard أولاً
-- ثم نفذ الأوامر التالية لتعيينه كإداري
-- ============================================

-- الخطوة 1: إضافة عمود role إذا لم يكن موجوداً
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- ============================================
-- الخطوة 2: بعد إنشاء المستخدم في Supabase Dashboard
-- استخدم هذا الأمر لتعيينه كإداري
-- ============================================
-- استبدل 'USER_ID_FROM_AUTH_USERS' بمعرف المستخدم من auth.users

-- الطريقة 1: إذا كان المستخدم موجود في profiles
UPDATE profiles 
SET role = 'admin', full_name = 'tamer88'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'tamer88@gmail.com'
);

-- الطريقة 2: إذا كان المستخدم غير موجود في profiles، أنشئه
INSERT INTO profiles (user_id, full_name, phone, role)
SELECT 
  id,
  'tamer88',
  'tamer88',
  'admin'
FROM auth.users 
WHERE email = 'tamer88@gmail.com'
ON CONFLICT DO NOTHING;

-- إذا فشلت الطريقة 2، استخدم هذا (بعد الحصول على user_id من auth.users):
-- INSERT INTO profiles (user_id, full_name, phone, role)
-- VALUES ('USER_ID_HERE'::uuid, 'tamer88', 'tamer88', 'admin')
-- ON CONFLICT DO NOTHING;

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



