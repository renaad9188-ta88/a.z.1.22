-- ============================================
-- إصلاح شامل لسياسات RLS - حل مشكلة 500 Error
-- ============================================
-- هذا الملف يحل جميع مشاكل RLS بشكل كامل
-- ============================================

-- الخطوة 1: حذف جميع السياسات القديمة
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own requests" ON visit_requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON visit_requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- الخطوة 2: إضافة عمود role إذا لم يكن موجوداً
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- ============================================
-- الخطوة 3: إنشاء السياسات الجديدة للمستخدمين العاديين
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
-- الخطوة 4: إنشاء السياسات الإدارية
-- ============================================

-- سياسة الإدارة لعرض جميع الطلبات
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

-- سياسة الإدارة لتحديث جميع الطلبات
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

-- سياسة الإدارة لعرض جميع الملفات الشخصية
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p2
      WHERE p2.user_id = auth.uid() 
      AND p2.role = 'admin'
    )
    OR auth.uid() = user_id  -- المستخدم يمكنه رؤية ملفه الشخصي
  );

-- ============================================
-- الخطوة 5: التأكد من أن المستخدم tamer88@gmail.com إداري
-- ============================================
-- إنشاء profile إذا لم يكن موجوداً
INSERT INTO profiles (user_id, full_name, phone, role)
SELECT 
  id,
  'tamer88',
  'tamer88',
  'admin'
FROM auth.users 
WHERE email = 'tamer88@gmail.com'
ON CONFLICT DO NOTHING;

-- تحديث role إذا كان موجوداً
UPDATE profiles 
SET role = 'admin', full_name = 'tamer88', phone = 'tamer88'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'tamer88@gmail.com'
);

-- ============================================
-- التحقق من النجاح
-- ============================================
-- 1. التحقق من السياسات
SELECT 
  tablename,
  policyname,
  cmd as command
FROM pg_policies 
WHERE tablename IN ('profiles', 'visit_requests')
ORDER BY tablename, policyname;

-- 2. التحقق من المستخدمين الإداريين
SELECT 
  p.user_id,
  p.full_name,
  p.phone,
  p.role,
  u.email
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE p.role = 'admin';

-- 3. التحقق من تفعيل RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('profiles', 'visit_requests');



