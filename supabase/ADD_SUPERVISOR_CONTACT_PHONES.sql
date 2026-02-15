-- إضافة حقول رقم التواصل للمشرفين
-- نفّذ هذا الملف في Supabase SQL Editor بعد تنفيذ ADD_SUPERVISOR_PERMISSIONS_SYSTEM.sql

-- إضافة حقول رقم التواصل للمشرف
ALTER TABLE supervisor_permissions
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS whatsapp_phone text;

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_supervisor_permissions_contact_phone ON supervisor_permissions(contact_phone) WHERE contact_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supervisor_permissions_whatsapp_phone ON supervisor_permissions(whatsapp_phone) WHERE whatsapp_phone IS NOT NULL;

-- ملاحظات:
-- 1. contact_phone: رقم الهاتف العادي للاتصال
-- 2. whatsapp_phone: رقم الواتساب
-- 3. المشرف يمكنه إضافة/تعديل هذه الأرقام من واجهة الصلاحيات
-- 4. المنتسبون سيرون رقم المشرف المخصص لهم بدلاً من رقم الإدمن

