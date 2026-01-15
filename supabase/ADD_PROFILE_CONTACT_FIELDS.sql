-- إضافة حقول أرقام التواصل في جدول profiles
-- الهدف: عدم طلب إدخال أرقام المستخدم كل مرة (تُحفظ في حسابه)
-- نفّذ هذا السكربت في Supabase SQL Editor مرة واحدة

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS jordan_phone TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;


