-- إضافة سياسة RLS للسماح للإدمن برؤية جميع الصور في storage
-- يجب تنفيذ هذا السكريبت في Supabase SQL Editor

-- حذف السياسات القديمة للصور (إن وجدت)
DROP POLICY IF EXISTS "Admins can view all passport images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all images" ON storage.objects;

-- إضافة سياسة جديدة للسماح للإدمن برؤية جميع الصور
CREATE POLICY "Admins can view all passport images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'passports' 
  AND (
    -- المستخدم يمكنه رؤية صوره الخاصة
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- أو المستخدم إدمن
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
);

-- التأكد من أن دالة is_admin() موجودة
-- (يجب أن تكون موجودة من السكريبتات السابقة)
-- إذا لم تكن موجودة، يمكنك استخدام الكود التالي:
-- CREATE OR REPLACE FUNCTION is_admin()
-- RETURNS boolean
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- STABLE
-- AS $$
-- DECLARE
--   user_role text;
-- BEGIN
--   IF auth.uid() IS NULL THEN
--     RETURN false;
--   END IF;
--   
--   SELECT role INTO user_role
--   FROM profiles
--   WHERE user_id = auth.uid();
--   
--   RETURN COALESCE(user_role = 'admin', false);
-- END;
-- $$;

-- ملاحظة: بعد تنفيذ هذا السكريبت، يجب أن يتمكن الإدمن من رؤية جميع الصور
-- إذا استمرت المشكلة، تحقق من:
-- 1. أن المستخدم مسجل كإدمن في جدول profiles
-- 2. أن role = 'admin' في جدول profiles
-- 3. أن bucket 'passports' موجود
-- 4. أن الصور موجودة فعلاً في storage



