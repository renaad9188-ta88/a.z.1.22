-- إضافة سياسة RLS للسماح للمستخدمين بحذف صورهم من bucket passports
-- يجب تنفيذ هذا السكريبت في Supabase SQL Editor

-- حذف السياسة إذا كانت موجودة بنفس الاسم
DROP POLICY IF EXISTS "Users can delete their own passport images" ON storage.objects;

-- إضافة سياسة جديدة للسماح للمستخدمين بحذف صورهم الخاصة
CREATE POLICY "Users can delete their own passport images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'passports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ملاحظة: بعد تنفيذ هذا السكريبت، يجب أن يتمكن المستخدمون من حذف صورهم
-- إذا استمرت المشكلة، تحقق من:
-- 1. أن المستخدم مسجل دخول (authenticated)
-- 2. أن bucket 'passports' موجود
-- 3. أن الصور موجودة فعلاً في storage
-- 4. أن المسار يبدأ بـ userId/

