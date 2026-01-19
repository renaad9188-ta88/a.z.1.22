-- تحسين دالة create_notification لضمان عملها بشكل صحيح
-- يجب تنفيذ هذا السكريبت في Supabase SQL Editor

-- حذف الدالة القديمة إذا كانت موجودة
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID);

-- إنشاء/تحديث دالة create_notification
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
SECURITY DEFINER -- هذا مهم جداً: يتجاوز RLS
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- التحقق من صحة المدخلات
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;
  
  IF p_title IS NULL OR p_title = '' THEN
    RAISE EXCEPTION 'title cannot be null or empty';
  END IF;
  
  IF p_message IS NULL OR p_message = '' THEN
    RAISE EXCEPTION 'message cannot be null or empty';
  END IF;
  
  -- التحقق من صحة النوع
  IF p_type NOT IN ('info', 'success', 'warning', 'error') THEN
    p_type := 'info';
  END IF;
  
  -- إدراج الإشعار
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

-- منح الصلاحيات للدالة
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;

-- ملاحظة: الدالة SECURITY DEFINER تتجاوز RLS، لذا يمكن لأي مستخدم إنشاء إشعار لأي مستخدم آخر
-- هذا مفيد عندما يريد المستخدم العادي إرسال إشعار للإدمن



