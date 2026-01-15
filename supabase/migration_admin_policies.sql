-- Migration: إضافة سياسات RLS للإدارة
-- تاريخ الإنشاء: 2024
-- الوصف: هذا الملف يضيف سياسات RLS للسماح للإدارة بالوصول إلى جميع الطلبات والملفات الشخصية

-- ============================================
-- الطريقة 1: استخدام معرف المستخدم مباشرة
-- ============================================
-- استبدل 'YOUR_ADMIN_USER_ID' بمعرف المستخدم الإداري من Supabase Auth
-- يمكنك الحصول على معرف المستخدم من: Authentication > Users > User UID

-- إضافة سياسة للإدارة لعرض جميع الطلبات
CREATE POLICY "Admins can view all requests"
  ON visit_requests FOR SELECT
  USING (
    auth.uid()::text = 'YOUR_ADMIN_USER_ID'
  );

-- إضافة سياسة للإدارة لتحديث جميع الطلبات
CREATE POLICY "Admins can update all requests"
  ON visit_requests FOR UPDATE
  USING (
    auth.uid()::text = 'YOUR_ADMIN_USER_ID'
  );

-- إضافة سياسة للإدارة لعرض جميع الملفات الشخصية
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid()::text = 'YOUR_ADMIN_USER_ID'
  );

-- ============================================
-- الطريقة 2: استخدام نظام الأدوار (موصى بها)
-- ============================================
-- هذه الطريقة أكثر مرونة وتسمح بإضافة عدة مسؤولين

-- إضافة عمود role إلى جدول profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- حذف السياسات القديمة إذا كانت موجودة (للطريقة 1)
DROP POLICY IF EXISTS "Admins can view all requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON visit_requests;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- إضافة السياسات الجديدة باستخدام نظام الأدوار
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
-- تعيين مستخدم كإداري
-- ============================================
-- استبدل 'USER_ID_HERE' بمعرف المستخدم الذي تريد تعيينه كإداري
-- يمكنك الحصول على معرف المستخدم من: Authentication > Users > User UID

-- مثال:
-- UPDATE profiles SET role = 'admin' WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'::uuid;

-- أو إذا كان المستخدم غير موجود في profiles، قم بإنشائه أولاً:
-- INSERT INTO profiles (user_id, full_name, role)
-- VALUES ('USER_ID_HERE'::uuid, 'اسم المسؤول', 'admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- ============================================
-- إضافة فهرس لتحسين الأداء
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE role = 'admin';

-- ============================================
-- التحقق من الإعداد
-- ============================================
-- يمكنك التحقق من أن السياسات تم إضافتها بنجاح:
-- SELECT * FROM pg_policies WHERE tablename = 'visit_requests';
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- التحقق من المستخدمين الإداريين:
-- SELECT user_id, full_name, role FROM profiles WHERE role = 'admin';



