-- ============================================
-- التأكد من وجود السياسات الإدارية بشكل صحيح
-- ============================================
-- هذا الملف يتحقق من السياسات ويعيد إنشاءها إذا لزم الأمر
-- ============================================

-- حذف السياسات الإدارية القديمة (إن وجدت)
DROP POLICY IF EXISTS "Admins can view all requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- إضافة عمود role إذا لم يكن موجوداً
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- ============================================
-- إعادة إنشاء السياسات الإدارية
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
    OR auth.uid() = user_id  -- المستخدم يمكنه رؤية ملفه الشخصي
  );

-- ============================================
-- التحقق من السياسات
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command
FROM pg_policies 
WHERE tablename IN ('profiles', 'visit_requests')
AND policyname LIKE '%Admin%'
ORDER BY tablename, policyname;




