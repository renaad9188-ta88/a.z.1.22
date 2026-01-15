-- ============================================
-- إصلاح شامل نهائي - وصول الإدمن لجميع البيانات
-- ============================================
-- هذا الملف يحل مشكلة عدم ظهور الطلبات والصور والمعلومات
-- نفذ هذا الملف بالكامل في Supabase SQL Editor
-- ============================================

-- ============================================
-- الخطوة 1: حذف التكرارات
-- ============================================
DELETE FROM profiles p1
WHERE EXISTS (
  SELECT 1 FROM profiles p2
  WHERE p2.user_id = p1.user_id AND p2.id > p1.id
);

-- ============================================
-- الخطوة 2: إضافة UNIQUE constraint
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_user_id_key' 
    AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ============================================
-- الخطوة 3: إضافة عمود role
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- ============================================
-- الخطوة 4: حذف جميع السياسات والـ functions القديمة
-- ============================================
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own requests" ON visit_requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON visit_requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP FUNCTION IF EXISTS is_admin();

-- ============================================
-- الخطوة 5: إنشاء profile للمستخدم tamer88@gmail.com
-- ============================================
INSERT INTO profiles (user_id, full_name, phone, role)
SELECT id, 'tamer88', 'tamer88', 'admin'
FROM auth.users 
WHERE email = 'tamer88@gmail.com'
ON CONFLICT (user_id) DO UPDATE 
SET role = 'admin', full_name = 'tamer88', phone = 'tamer88';

-- ============================================
-- الخطوة 6: إنشاء function للتحقق من الإدمن (SECURITY DEFINER)
-- ============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM profiles
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- ============================================
-- الخطوة 7: إنشاء السياسات للمستخدمين العاديين
-- ============================================

-- سياسات profiles للمستخدمين
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- سياسات visit_requests للمستخدمين
CREATE POLICY "Users can view their own requests"
  ON visit_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests"
  ON visit_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own requests"
  ON visit_requests FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- الخطوة 8: إنشاء السياسات الإدارية (باستخدام function)
-- ============================================

-- سياسة الإدارة لعرض جميع الطلبات
CREATE POLICY "Admins can view all requests"
  ON visit_requests FOR SELECT
  USING (is_admin());

-- سياسة الإدارة لتحديث جميع الطلبات
CREATE POLICY "Admins can update all requests"
  ON visit_requests FOR UPDATE
  USING (is_admin());

-- سياسة الإدارة لعرض جميع الملفات الشخصية
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin() OR auth.uid() = user_id);

-- ============================================
-- الخطوة 9: التحقق من RLS مفعل
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- الخطوة 10: التحقق من النجاح
-- ============================================

-- التحقق من عدم وجود تكرارات
SELECT 'التكرارات:' as check_type, COUNT(*) as count
FROM (
  SELECT user_id, COUNT(*) as cnt
  FROM profiles
  GROUP BY user_id
  HAVING COUNT(*) > 1
) duplicates;

-- التحقق من السياسات
SELECT 'السياسات:' as check_type, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'visit_requests')
ORDER BY tablename, policyname;

-- التحقق من المستخدمين الإداريين
SELECT 'الإداريون:' as check_type, p.user_id, p.full_name, p.phone, p.role, u.email
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE p.role = 'admin';

-- التحقق من عدد الطلبات (يجب أن يظهر جميع الطلبات للإدمن)
SELECT 'الطلبات:' as check_type, COUNT(*) as total_requests
FROM visit_requests;

-- اختبار function is_admin() للمستخدم الحالي
-- (سيظهر true إذا كنت مسجل دخول كإدمن)
SELECT 'اختبار is_admin():' as check_type, is_admin() as is_admin_result;



