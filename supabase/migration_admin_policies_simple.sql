-- Migration: إضافة سياسات RLS للإدارة (الطريقة البسيطة)
-- هذا الملف يستخدم معرف المستخدم مباشرة (أسهل للبداية)

-- ============================================
-- الخطوة 1: احصل على معرف المستخدم الإداري
-- ============================================
-- 1. اذهب إلى Supabase Dashboard
-- 2. Authentication > Users
-- 3. انسخ User UID للمستخدم الذي تريد تعيينه كإداري
-- 4. استبدل 'YOUR_ADMIN_USER_ID' أدناه بمعرف المستخدم

-- ============================================
-- الخطوة 2: تنفيذ الأوامر التالية
-- ============================================

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
-- مثال:
-- ============================================
-- إذا كان معرف المستخدم هو: 123e4567-e89b-12d3-a456-426614174000
-- استبدل 'YOUR_ADMIN_USER_ID' بهذا المعرف:
--
-- CREATE POLICY "Admins can view all requests"
--   ON visit_requests FOR SELECT
--   USING (
--     auth.uid()::text = '123e4567-e89b-12d3-a456-426614174000'
--   );


