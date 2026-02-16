-- تحديث جدول رسائل التواصل لإضافة حقول جديدة
ALTER TABLE public.contact_messages 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS assigned_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS admin_response TEXT,
ADD COLUMN IF NOT EXISTS response_sent_at TIMESTAMP WITH TIME ZONE;

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_contact_messages_assigned_to ON public.contact_messages(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created ON public.contact_messages(status, created_at DESC);

