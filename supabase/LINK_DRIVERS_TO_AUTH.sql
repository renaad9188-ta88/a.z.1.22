-- Link drivers table rows to auth users, so drivers can login and see their assigned routes.
-- This script is safe to run multiple times.

-- 0) Helper: is_driver()
CREATE OR REPLACE FUNCTION public.is_driver()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND lower(role) = 'driver'
  );
END;
$$;

-- 1) Add drivers.user_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'drivers'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.drivers
      ADD COLUMN user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2) Make user_id unique when present (one auth user -> one driver row)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.drivers'::regclass
      AND c.contype = 'u'
      AND c.conname = 'drivers_user_id_key'
  ) THEN
    ALTER TABLE public.drivers
      ADD CONSTRAINT drivers_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON public.drivers(user_id);

-- 3) Optional backfill: link by matching phone between profiles and drivers (only if user_id is NULL)
UPDATE public.drivers d
SET user_id = p.user_id
FROM public.profiles p
WHERE d.user_id IS NULL
  AND p.user_id IS NOT NULL
  AND p.phone IS NOT NULL
  AND d.phone = p.phone
  AND lower(p.role) = 'driver';


