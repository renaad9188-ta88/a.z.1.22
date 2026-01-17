-- إنشاء جدول الإشعارات
-- يجب تنفيذ هذا السكريبت في Supabase SQL Editor

-- إنشاء جدول notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  related_type TEXT, -- نوع الإشعار: 'request', 'trip', 'payment', etc.
  related_id UUID, -- معرف العنصر المرتبط (request_id, trip_id, etc.)
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- إنشاء indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- المستخدمون يمكنهم رؤية إشعاراتهم فقط
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- المستخدمون يمكنهم تحديث إشعاراتهم (قراءة/عدم قراءة)
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- الإدمن يمكنهم إنشاء إشعارات لأي مستخدم
CREATE POLICY "Admins can create notifications"
ON notifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- دالة لإنشاء إشعار تلقائياً
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_related_type TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    related_type,
    related_id
  )
  VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_related_type,
    p_related_id
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;



