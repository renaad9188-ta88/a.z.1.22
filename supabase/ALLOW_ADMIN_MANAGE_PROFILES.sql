-- Allow admins (and supervisors) to manage profiles (UPDATE/INSERT), required to assign role=driver.
-- Without this, linking a user account to a driver will NOT be able to update profiles.role due to RLS.
--
-- Run this file once in Supabase SQL Editor.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Make sure role constraint includes driver/supervisor (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_role_check'
      AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('user', 'admin', 'driver', 'supervisor'));
END $$;

-- Admins can manage all profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles
  FOR ALL
  USING (public.is_admin() OR public.is_supervisor())
  WITH CHECK (public.is_admin() OR public.is_supervisor());


