-- ============================================
-- الخطوة 1: حذف السياسات القديمة (إذا كانت موجودة)
-- ============================================
-- نفذ هذه الأوامر أولاً لحذف أي سياسات قديمة

DROP POLICY IF EXISTS "Admins can view all requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- ============================================
-- الخطوة 2: إضافة عمود role (إذا لم يكن موجوداً)
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- ============================================
-- الخطوة 3: إضافة السياسات الجديدة
-- ============================================

-- سياسة عرض جميع الطلبات للإدارة
CREATE POLICY "Admins can view all requests"
  ON visit_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- سياسة تحديث جميع الطلبات للإدارة
CREATE POLICY "Admins can update all requests"
  ON visit_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- سياسة عرض جميع الملفات الشخصية للإدارة
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR auth.uid() = user_id
  );

-- ============================================
-- الخطوة 4: إضافة فهرس لتحسين الأداء
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE role = 'admin';

-- ============================================
-- الخطوة 5: تعيين مستخدم كإداري
-- ============================================
-- استبدل 'USER_ID_HERE' بمعرف المستخدم من Authentication > Users > User UID
-- مثال: '123e4567-e89b-12d3-a456-426614174000'

-- إذا كان المستخدم موجود في profiles:
-- UPDATE profiles SET role = 'admin' WHERE user_id = 'USER_ID_HERE'::uuid;

-- إذا كان المستخدم غير موجود، أنشئه:
-- INSERT INTO profiles (user_id, full_name, role)
-- VALUES ('USER_ID_HERE'::uuid, 'اسم المسؤول', 'admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';


