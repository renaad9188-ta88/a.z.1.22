-- ============================================
-- إصلاح سياسات RLS لحل مشكلة 500 Error
-- ============================================
-- هذا الملف يصلح السياسات لتعمل بشكل صحيح
-- ============================================

-- الخطوة 1: التحقق من السياسات الحالية
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';
-- SELECT * FROM pg_policies WHERE tablename = 'visit_requests';

-- ============================================
-- الخطوة 2: حذف السياسات القديمة المشكلة
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
-- الخطوة 3: إضافة السياسات الجديدة الصحيحة
-- ============================================

-- سياسات profiles للمستخدمين العاديين
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- سياسات visit_requests للمستخدمين العاديين
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
-- الخطوة 4: إضافة سياسات الإدارة
-- ============================================
-- تأكد من أن عمود role موجود
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- سياسات الإدارة لـ visit_requests
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

-- سياسات الإدارة لـ profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR auth.uid() = user_id  -- المستخدم يمكنه رؤية ملفه الشخصي
  );

-- ============================================
-- التحقق من النجاح
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'visit_requests')
ORDER BY tablename, policyname;





