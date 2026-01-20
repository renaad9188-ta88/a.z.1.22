-- Add trip_type to route_trips to support arrivals vs departures
-- Run in Supabase SQL Editor.

ALTER TABLE public.route_trips
  ADD COLUMN IF NOT EXISTS trip_type text NOT NULL DEFAULT 'arrival';

-- Keep values constrained
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'route_trips_trip_type_check'
  ) THEN
    ALTER TABLE public.route_trips
      ADD CONSTRAINT route_trips_trip_type_check CHECK (trip_type IN ('arrival','departure'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_route_trips_route_type_date
  ON public.route_trips(route_id, trip_type, trip_date);


