-- إضافة سياسات RLS للسماح للإدمن والمشرف برفع صور محطات النزول
-- يجب تنفيذ هذا السكريبت في Supabase SQL Editor

-- 1. السماح للإدمن والمشرف برفع الصور في مجلد route-stops
DROP POLICY IF EXISTS "Admins and supervisors can upload route stop images" ON storage.objects;
CREATE POLICY "Admins and supervisors can upload route stop images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'passports'
  AND (
    name LIKE 'route-stops/%'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND lower(coalesce(p.role, '')) IN ('admin', 'supervisor')
    )
  )
);

-- 2. السماح للإدمن والمشرف بحذف الصور من مجلد route-stops
DROP POLICY IF EXISTS "Admins and supervisors can delete route stop images" ON storage.objects;
CREATE POLICY "Admins and supervisors can delete route stop images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'passports'
  AND (
    name LIKE 'route-stops/%'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND lower(coalesce(p.role, '')) IN ('admin', 'supervisor')
    )
  )
);

-- 3. السماح للإدمن والمشرف برؤية الصور من مجلد route-stops
DROP POLICY IF EXISTS "Admins and supervisors can view route stop images" ON storage.objects;
CREATE POLICY "Admins and supervisors can view route stop images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'passports'
  AND (
    name LIKE 'route-stops/%'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND lower(coalesce(p.role, '')) IN ('admin', 'supervisor')
    )
  )
);

-- 4. السماح للجميع (public) برؤية الصور من مجلد route-stops (لأنها ستكون public URLs)
-- هذا اختياري - إذا كنت تريد أن تكون الصور مرئية للجميع
DROP POLICY IF EXISTS "Public can view route stop images" ON storage.objects;
CREATE POLICY "Public can view route stop images"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'passports'
  AND name LIKE 'route-stops/%'
);

-- 5. جعل الـ bucket public للصور في route-stops (اختياري - إذا كنت تريد الصور مرئية للجميع)
-- إذا كنت تريد أن تكون الصور مرئية للجميع بدون signed URL، قم بتشغيل هذا:
-- UPDATE storage.buckets SET public = true WHERE id = 'passports';
-- لكن هذا يجعل جميع الصور في bucket 'passports' مرئية للجميع
-- بدلاً من ذلك، يمكنك إنشاء bucket منفصل للصور العامة:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('route_stops_images', 'route_stops_images', true)
-- ON CONFLICT (id) DO UPDATE SET public = true;

-- ملاحظات:
-- 1. تأكد من أن bucket 'passports' موجود
-- 2. تأكد من أن المستخدم مسجل كـ admin أو supervisor في جدول profiles
-- 3. بعد تنفيذ هذا السكريبت، يجب أن يتمكن الإدمن والمشرف من رفع الصور
-- 4. إذا كانت الصور لا تظهر، جرب استخدام signed URL (الكود محدث لاستخدام signed URL تلقائياً)

