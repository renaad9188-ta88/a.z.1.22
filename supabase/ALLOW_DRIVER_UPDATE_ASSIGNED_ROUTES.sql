-- Allow drivers to update start/end points (and name/description) for routes they are assigned to.
-- This enables driver to set نقطة الانطلاق ونقطة الوصول from the driver dashboard.
--
-- Run in Supabase SQL Editor.

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can update their assigned routes" ON public.routes;
CREATE POLICY "Drivers can update their assigned routes"
  ON public.routes FOR UPDATE
  USING (
    public.is_admin()
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.route_drivers rd
        JOIN public.drivers d ON d.id = rd.driver_id
        WHERE rd.route_id = routes.id
          AND rd.is_active = true
          AND d.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_driver()
      AND EXISTS (
        SELECT 1
        FROM public.route_drivers rd
        JOIN public.drivers d ON d.id = rd.driver_id
        WHERE rd.route_id = routes.id
          AND rd.is_active = true
          AND d.user_id = auth.uid()
      )
    )
  );


