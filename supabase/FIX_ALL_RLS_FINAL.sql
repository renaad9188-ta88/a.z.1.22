-- ============================================
-- إصلاح شامل نهائي لجميع مشاكل RLS
-- ============================================
-- هذا الملف يحل مشكلة 500 Error بشكل كامل
-- نفذ هذا الملف بالكامل في Supabase SQL Editor
-- ============================================

-- ============================================
-- الخطوة 1: حذف التكرارات من profiles أولاً
-- ============================================
-- نحتفظ بأحدث profile لكل user_id ونحذف الباقي
DELETE FROM profiles p1
WHERE EXISTS (
  SELECT 1 FROM profiles p2
  WHERE p2.user_id = p1.user_id
  AND p2.id > p1.id
);

-- ============================================
-- الخطوة 2: إضافة UNIQUE constraint على user_id
-- ============================================
-- هذا مهم لاستخدام ON CONFLICT
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
-- الخطوة 2: حذف جميع السياسات القديمة
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

-- ============================================
-- الخطوة 3: إضافة عمود role
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- ============================================
-- الخطوة 4: إنشاء profile للمستخدم tamer88@gmail.com
-- ============================================
INSERT INTO profiles (user_id, full_name, phone, role)
SELECT 
  id,
  'tamer88',
  'tamer88',
  'admin'
FROM auth.users 
WHERE email = 'tamer88@gmail.com'
ON CONFLICT (user_id) DO UPDATE 
SET role = 'admin', full_name = 'tamer88', phone = 'tamer88';

-- ============================================
-- الخطوة 5: إنشاء السياسات للمستخدمين العاديين
-- ============================================

-- سياسات profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- سياسات visit_requests
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
-- الخطوة 6: إنشاء السياسات الإدارية
-- ============================================

-- سياسة الإدارة لعرض جميع الطلبات
CREATE POLICY "Admins can view all requests"
  ON visit_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- سياسة الإدارة لتحديث جميع الطلبات
CREATE POLICY "Admins can update all requests"
  ON visit_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- سياسة الإدارة لعرض جميع الملفات الشخصية
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    )
    OR auth.uid() = user_id
  );

-- ============================================
-- الخطوة 7: التحقق من النجاح
-- ============================================

-- التحقق من السياسات
SELECT 
  tablename,
  policyname,
  cmd as command
FROM pg_policies 
WHERE tablename IN ('profiles', 'visit_requests')
ORDER BY tablename, policyname;

-- التحقق من المستخدمين الإداريين
SELECT 
  p.user_id,
  p.full_name,
  p.phone,
  p.role,
  u.email
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE p.role = 'admin';

-- التحقق من تفعيل RLS
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('profiles', 'visit_requests');
