-- Fix: ensure route_drivers has a UNIQUE constraint for (route_id, driver_id)
-- This is required for INSERT ... ON CONFLICT (route_id, driver_id) to work.
-- Note: CREATE TABLE IF NOT EXISTS will NOT add new constraints to an existing table.

-- 1) Remove duplicates (keep the newest row per (route_id, driver_id))
WITH ranked AS (
  SELECT
    id,
    route_id,
    driver_id,
    ROW_NUMBER() OVER (
      PARTITION BY route_id, driver_id
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.route_drivers
)
DELETE FROM public.route_drivers rd
USING ranked r
WHERE rd.id = r.id
  AND r.rn > 1;

-- 2) Add UNIQUE constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.route_drivers'::regclass
      AND c.contype = 'u'
      AND c.conname = 'route_drivers_route_id_driver_id_key'
  ) THEN
    ALTER TABLE public.route_drivers
      ADD CONSTRAINT route_drivers_route_id_driver_id_key
      UNIQUE (route_id, driver_id);
  END IF;
END $$;


