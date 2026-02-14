-- إضافة الحذف الناعم (Soft Delete) لجدول visit_requests
-- نفّذ هذا السكربت في Supabase SQL Editor

-- 1) إضافة عمود deleted_at و deleted_by
ALTER TABLE public.visit_requests
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2) إنشاء فهرس لتحسين الأداء (فقط للطلبات غير المحذوفة)
CREATE INDEX IF NOT EXISTS idx_visit_requests_deleted_at 
  ON public.visit_requests(deleted_at) 
  WHERE deleted_at IS NULL;

-- 3) تحديث RLS للسماح للإدمن بتحديث deleted_at
-- ملاحظة: السياسات الحالية للإدمن تسمح بالتحديث، لكن نضيف سياسة واضحة
-- (عادة السياسات الموجودة للإدمن كافية، لكن للتأكد)

-- 4) تعليق مفيد:
-- عند حذف طلب، استخدم:
-- UPDATE visit_requests 
-- SET deleted_at = NOW(), deleted_by = auth.uid()
-- WHERE id = '...';
--
-- لعرض الطلبات المحذوفة:
-- SELECT * FROM visit_requests WHERE deleted_at IS NOT NULL;
--
-- لاسترجاع طلب محذوف:
-- UPDATE visit_requests 
-- SET deleted_at = NULL, deleted_by = NULL
-- WHERE id = '...';

