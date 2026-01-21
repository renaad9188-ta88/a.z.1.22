-- Public, PII-safe route_trips overview + schedule for homepage.
-- Uses route_trips (admin-entered trips) and counts bookings via visit_requests.trip_id (+ companions_count).
-- Run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.get_public_route_trips_overview()
RETURNS TABLE (
  default_route_name text,
  default_route_start text,
  default_route_end text,
  next_arrival_trip_id uuid,
  next_arrival_date date,
  next_arrival_time time,
  next_arrival_people_count integer,
  next_departure_trip_id uuid,
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
      rt.id AS trip_id,
      rt.trip_date::date AS d,
      COALESCE(rt.departure_time, rt.meeting_time) AS t
    FROM public.route_trips rt
    WHERE rt.is_active = true
      AND COALESCE(lower(rt.trip_type), 'arrivals') IN ('arrivals','arrival')
      AND rt.trip_date::date >= CURRENT_DATE
    ORDER BY rt.trip_date::date ASC, COALESCE(rt.departure_time, rt.meeting_time) ASC NULLS LAST, rt.created_at ASC
    LIMIT 1
  ),
  arrival_count AS (
    SELECT
      COALESCE(SUM(1 + COALESCE(vr.companions_count, 0)), 0)::int AS people_count
    FROM public.visit_requests vr
    WHERE vr.trip_id = (SELECT trip_id FROM next_arrival)
      AND vr.status <> 'rejected'
  ),
  next_departure AS (
    SELECT
      rt.id AS trip_id,
      rt.trip_date::date AS d,
      COALESCE(rt.departure_time, rt.meeting_time) AS t
    FROM public.route_trips rt
    WHERE rt.is_active = true
      AND COALESCE(lower(rt.trip_type), 'arrivals') IN ('departures','departure')
      AND rt.trip_date::date >= CURRENT_DATE
    ORDER BY rt.trip_date::date ASC, COALESCE(rt.departure_time, rt.meeting_time) ASC NULLS LAST, rt.created_at ASC
    LIMIT 1
  ),
  departure_count AS (
    SELECT
      COALESCE(SUM(1 + COALESCE(vr.companions_count, 0)), 0)::int AS people_count
    FROM public.visit_requests vr
    WHERE vr.trip_id = (SELECT trip_id FROM next_departure)
      AND vr.status <> 'rejected'
  )
  SELECT
    (SELECT route_name FROM default_route),
    (SELECT route_start FROM default_route),
    (SELECT route_end FROM default_route),
    (SELECT trip_id FROM next_arrival),
    (SELECT d FROM next_arrival),
    (SELECT t FROM next_arrival),
    CASE WHEN (SELECT trip_id FROM next_arrival) IS NULL THEN NULL ELSE (SELECT people_count FROM arrival_count) END,
    (SELECT trip_id FROM next_departure),
    (SELECT d FROM next_departure),
    (SELECT t FROM next_departure),
    CASE WHEN (SELECT trip_id FROM next_departure) IS NULL THEN NULL ELSE (SELECT people_count FROM departure_count) END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_route_trips_overview() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_route_trips_overview() TO authenticated;


CREATE OR REPLACE FUNCTION public.get_public_route_trips_schedule(p_kind text, p_limit int DEFAULT 6)
RETURNS TABLE (
  trip_id uuid,
  trip_date date,
  trip_time time,
  people_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH kind AS (SELECT lower(coalesce(p_kind, 'arrivals')) AS k),
  base AS (
    SELECT
      rt.id AS trip_id,
      rt.trip_date::date AS trip_date,
      COALESCE(rt.departure_time, rt.meeting_time) AS trip_time
    FROM public.route_trips rt
    JOIN kind ON true
    WHERE rt.is_active = true
      AND (
        (kind.k = 'arrivals' AND COALESCE(lower(rt.trip_type), 'arrivals') IN ('arrivals','arrival'))
        OR (kind.k = 'departures' AND COALESCE(lower(rt.trip_type), 'departures') IN ('departures','departure'))
      )
      AND rt.trip_date::date >= CURRENT_DATE
    ORDER BY rt.trip_date::date ASC, COALESCE(rt.departure_time, rt.meeting_time) ASC NULLS LAST, rt.created_at ASC
    LIMIT GREATEST(1, LEAST(p_limit, 20))
  )
  SELECT
    b.trip_id,
    b.trip_date,
    b.trip_time,
    COALESCE((
      SELECT SUM(1 + COALESCE(vr.companions_count, 0))::int
      FROM public.visit_requests vr
      WHERE vr.trip_id = b.trip_id
        AND vr.status <> 'rejected'
    ), 0)::int AS people_count
  FROM base b;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_route_trips_schedule(text, int) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_route_trips_schedule(text, int) TO authenticated;


