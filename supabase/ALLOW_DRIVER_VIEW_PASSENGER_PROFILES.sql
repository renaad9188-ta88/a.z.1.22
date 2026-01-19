-- Allow drivers to view passenger profiles (name/phone) for requests they can access.
-- Needed for driver dashboards that show passenger phone numbers.
--
-- Run in Supabase SQL Editor.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view passenger profiles for accessible requests" ON public.profiles;
CREATE POLICY "Drivers can view passenger profiles for accessible requests"
  ON public.profiles FOR SELECT
  USING (
    public.is_admin()
    OR auth.uid() = user_id
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.visit_requests vr
        -- route-based access
        JOIN public.route_drivers rd ON rd.route_id = vr.route_id AND rd.is_active = true
        JOIN public.drivers d ON d.id = rd.driver_id
        WHERE vr.user_id = profiles.user_id
          AND d.user_id = auth.uid()
      )
    )
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.visit_requests vr
        JOIN public.drivers d ON d.id = vr.assigned_driver_id
        WHERE vr.user_id = profiles.user_id
          AND d.user_id = auth.uid()
      )
    )
  );


