-- دالة للحصول على جميع الإدمن (تعمل كـ SECURITY DEFINER لتجاوز RLS)
CREATE OR REPLACE FUNCTION get_all_admins()
RETURNS TABLE(user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id
  FROM profiles p
  WHERE p.role = 'admin';
END;
$$;

-- منح الصلاحيات للدالة
GRANT EXECUTE ON FUNCTION get_all_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_admins() TO anon;




