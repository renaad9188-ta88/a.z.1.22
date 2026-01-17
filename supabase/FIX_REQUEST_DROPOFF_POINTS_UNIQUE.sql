-- Fix: ensure request_dropoff_points has a UNIQUE constraint for (request_id)
-- This is required for UPSERT ... onConflict: 'request_id' in the app.

-- 1) Remove duplicates (keep the newest row per request_id)
WITH ranked AS (
  SELECT
    id,
    request_id,
    ROW_NUMBER() OVER (
      PARTITION BY request_id
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.request_dropoff_points
)
DELETE FROM public.request_dropoff_points rdp
USING ranked r
WHERE rdp.id = r.id
  AND r.rn > 1;

-- 2) Add UNIQUE constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.request_dropoff_points'::regclass
      AND c.contype = 'u'
      AND c.conname = 'request_dropoff_points_request_id_key'
  ) THEN
    ALTER TABLE public.request_dropoff_points
      ADD CONSTRAINT request_dropoff_points_request_id_key
      UNIQUE (request_id);
  END IF;
END $$;



