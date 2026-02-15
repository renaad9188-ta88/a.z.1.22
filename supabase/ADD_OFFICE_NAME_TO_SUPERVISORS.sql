-- إضافة حقل اسم المكتب ونوع العرض للمشرفين
-- الهدف: السماح للمشرفين بالظهور كمكاتب سياحية أو مشرفين
-- نفّذ هذا الملف في Supabase SQL Editor

-- 1) إضافة حقل اسم المكتب
ALTER TABLE public.supervisor_permissions
  ADD COLUMN IF NOT EXISTS office_name text;

-- 2) إضافة حقل نوع العرض (office/supervisor)
ALTER TABLE public.supervisor_permissions
  ADD COLUMN IF NOT EXISTS display_type text DEFAULT 'supervisor' CHECK (display_type IN ('office', 'supervisor'));

-- 3) إنشاء index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_supervisor_permissions_office_name 
  ON public.supervisor_permissions(office_name) 
  WHERE office_name IS NOT NULL;

-- 4) تحديث القيم الافتراضية للمشرفين الحاليين
UPDATE public.supervisor_permissions
SET display_type = 'supervisor'
WHERE display_type IS NULL;

