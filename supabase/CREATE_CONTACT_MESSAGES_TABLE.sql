-- إنشاء جدول رسائل التواصل
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_notes TEXT
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);

-- تفعيل RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- سياسة: الإدمن يمكنه رؤية جميع الرسائل
CREATE POLICY "Admins can view all contact messages"
  ON public.contact_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- سياسة: الإدمن يمكنه تحديث الرسائل
CREATE POLICY "Admins can update contact messages"
  ON public.contact_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- سياسة: أي شخص يمكنه إرسال رسالة (INSERT)
CREATE POLICY "Anyone can insert contact messages"
  ON public.contact_messages
  FOR INSERT
  WITH CHECK (true);

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.update_contact_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث updated_at
DROP TRIGGER IF EXISTS trigger_update_contact_messages_updated_at ON public.contact_messages;
CREATE TRIGGER trigger_update_contact_messages_updated_at
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contact_messages_updated_at();

-- تعليقات على الجدول
COMMENT ON TABLE public.contact_messages IS 'جدول رسائل التواصل من المستخدمين';
COMMENT ON COLUMN public.contact_messages.status IS 'حالة الرسالة: new, read, replied, archived';
COMMENT ON COLUMN public.contact_messages.admin_notes IS 'ملاحظات الإدمن على الرسالة';

