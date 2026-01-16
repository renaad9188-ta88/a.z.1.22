-- Public, PII-safe trip overview for homepage
-- Returns the next "arrivals" date and next "departures" date with people counts (including companions).
-- Also returns a default active route label (first active route) for display.

CREATE OR REPLACE FUNCTION public.get_public_trip_overview()
RETURNS TABLE (
  default_route_name text,
  default_route_start text,
  default_route_end text,
  next_arrival_date date,
  next_arrival_time time,
  next_arrival_people_count integer,
  next_departure_date date,
  next_departure_time time,
  next_departure_people_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH default_route AS (
    SELECT
      r.name AS route_name,
      r.start_location_name AS route_start,
      r.end_location_name AS route_end
    FROM public.routes r
    WHERE r.is_active = true
    ORDER BY r.created_at ASC
    LIMIT 1
  ),
  next_arrival AS (
    SELECT
      vr.arrival_date::date AS d,
      vr.arrival_time AS t
    FROM public.visit_requests vr
    WHERE vr.status = 'approved'
      AND vr.arrival_date IS NOT NULL
      AND vr.arrival_date::date >= CURRENT_DATE
      AND (vr.trip_status IN ('pending_arrival', 'arrived') OR vr.trip_status IS NULL)
    ORDER BY vr.arrival_date::date ASC, vr.arrival_time ASC NULLS LAST
    LIMIT 1
  ),
  arrival_count AS (
    SELECT
      COALESCE(SUM(1 + COALESCE(vr.companions_count, 0)), 0)::int AS people_count
    FROM public.visit_requests vr
    WHERE vr.status = 'approved'
      AND vr.arrival_date IS NOT NULL
      AND vr.arrival_date::date = (SELECT d FROM next_arrival)
  ),
  next_departure AS (
    SELECT
      vr.departure_date::date AS d,
      vr.departure_time AS t
    FROM public.visit_requests vr
    WHERE vr.status = 'approved'
      AND vr.departure_date IS NOT NULL
      AND vr.departure_date::date >= CURRENT_DATE
    ORDER BY vr.departure_date::date ASC, vr.departure_time ASC NULLS LAST
    LIMIT 1
  ),
  departure_count AS (
    SELECT
      COALESCE(SUM(1 + COALESCE(vr.companions_count, 0)), 0)::int AS people_count
    FROM public.visit_requests vr
    WHERE vr.status = 'approved'
      AND vr.departure_date IS NOT NULL
      AND vr.departure_date::date = (SELECT d FROM next_departure)
  )
  SELECT
    (SELECT route_name FROM default_route),
    (SELECT route_start FROM default_route),
    (SELECT route_end FROM default_route),
    (SELECT d FROM next_arrival),
    (SELECT t FROM next_arrival),
    CASE WHEN (SELECT d FROM next_arrival) IS NULL THEN NULL ELSE (SELECT people_count FROM arrival_count) END,
    (SELECT d FROM next_departure),
    (SELECT t FROM next_departure),
    CASE WHEN (SELECT d FROM next_departure) IS NULL THEN NULL ELSE (SELECT people_count FROM departure_count) END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_trip_overview() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_trip_overview() TO authenticated;


