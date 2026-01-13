-- Migration: تنظيف وإعادة إعداد سياسات RLS للإدارة
-- هذا الملف يحذف جميع السياسات القديمة ويعيد إنشائها من الصفر
-- استخدم هذا الملف إذا واجهت مشاكل مع السياسات الموجودة

-- ============================================
-- حذف جميع السياسات القديمة
-- ============================================
DROP POLICY IF EXISTS "Admins can view all requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- ============================================
-- إضافة عمود role (إذا لم يكن موجوداً)
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- ============================================
-- إنشاء السياسات الجديدة
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
-- إضافة فهرس لتحسين الأداء
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE role = 'admin';


