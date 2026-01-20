-- Public, PII-safe trip map data for homepage.
-- Returns the "current" trip (today, closest to now) for arrivals/departures.
-- If there is no trip today/upcoming, returns the next upcoming trip.
-- If there are no trips at all, returns a DEMO path based on the first active route + its fixed stop points.
--
-- Run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.get_public_trip_map(p_kind text DEFAULT 'arrivals')
RETURNS TABLE (
  trip_id uuid,
  trip_type text,
  trip_date date,
  meeting_time time,
  departure_time time,
  start_location_name text,
  start_lat double precision,
  start_lng double precision,
  end_location_name text,
  end_lat double precision,
  end_lng double precision,
  stops jsonb,
  is_demo boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH kind AS (
    SELECT lower(coalesce(p_kind, 'arrivals')) AS k
  ),
  -- pick a "current" trip for today (closest to now), else next future trip
  candidates AS (
    SELECT
      rt.*
    FROM public.route_trips rt
    JOIN kind ON true
    WHERE rt.is_active = true
      AND coalesce(lower(rt.trip_type), 'arrivals') = kind.k
  ),
  today_pick AS (
    SELECT
      c.*
    FROM candidates c
    WHERE c.trip_date = CURRENT_DATE
      AND (
        c.departure_time IS NULL
        OR (c.departure_time >= (CURRENT_TIME - interval '2 hours')::time)
      )
    ORDER BY
      -- closest departure_time to now (NULLs last)
      CASE
        WHEN c.departure_time IS NULL THEN 999999999
        ELSE abs(extract(epoch from (c.departure_time - (CURRENT_TIME::time))))
      END ASC,
      c.departure_time ASC NULLS LAST,
      c.created_at ASC
    LIMIT 1
  ),
  future_pick AS (
    SELECT
      c.*
    FROM candidates c
    WHERE c.trip_date > CURRENT_DATE
    ORDER BY c.trip_date ASC, c.departure_time ASC NULLS LAST, c.created_at ASC
    LIMIT 1
  ),
  -- Latest created trip for this kind (explicitly requested for homepage "latest entered trip")
  latest_pick AS (
    SELECT c.*
    FROM candidates c
    ORDER BY c.created_at DESC
    LIMIT 1
  ),
  chosen AS (
    SELECT * FROM latest_pick
    LIMIT 1
  ),
  trip_stops AS (
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'name', s.name,
          'lat', s.lat,
          'lng', s.lng,
          'order_index', s.order_index
        )
        ORDER BY s.order_index ASC
      ) AS j
    FROM public.route_trip_stop_points s
    WHERE s.trip_id = (SELECT id FROM chosen)
  ),
  route_stops_fallback AS (
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'name', sp.name,
          'lat', sp.lat,
          'lng', sp.lng,
          'order_index', sp.order_index
        )
        ORDER BY sp.order_index ASC
      ) AS j
    FROM public.route_stop_points sp
    WHERE sp.route_id = (SELECT route_id FROM chosen)
      AND sp.is_active = true
  ),
  demo_route AS (
    SELECT
      r.*
    FROM public.routes r
    WHERE r.is_active = true
    ORDER BY r.created_at ASC
    LIMIT 1
  ),
  demo_stops AS (
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'name', sp.name,
          'lat', sp.lat,
          'lng', sp.lng,
          'order_index', sp.order_index
        )
        ORDER BY sp.order_index ASC
      ) AS j
    FROM public.route_stop_points sp
    WHERE sp.route_id = (SELECT id FROM demo_route)
      AND sp.is_active = true
    LIMIT 1
  )
  SELECT
    (SELECT id FROM chosen) AS trip_id,
    (SELECT coalesce(lower(trip_type), 'arrivals') FROM chosen) AS trip_type,
    (SELECT trip_date FROM chosen) AS trip_date,
    (SELECT meeting_time FROM chosen) AS meeting_time,
    (SELECT departure_time FROM chosen) AS departure_time,
    (SELECT start_location_name FROM chosen) AS start_location_name,
    (SELECT start_lat FROM chosen) AS start_lat,
    (SELECT start_lng FROM chosen) AS start_lng,
    (SELECT end_location_name FROM chosen) AS end_location_name,
    (SELECT end_lat FROM chosen) AS end_lat,
    (SELECT end_lng FROM chosen) AS end_lng,
    COALESCE((SELECT j FROM trip_stops), (SELECT j FROM route_stops_fallback), '[]'::jsonb) AS stops,
    false AS is_demo
  WHERE (SELECT count(*) FROM chosen) > 0

  UNION ALL

  SELECT
    NULL::uuid AS trip_id,
    (SELECT k FROM kind) AS trip_type,
    NULL::date AS trip_date,
    NULL::time AS meeting_time,
    NULL::time AS departure_time,
    (SELECT start_location_name FROM demo_route) AS start_location_name,
    (SELECT start_lat FROM demo_route) AS start_lat,
    (SELECT start_lng FROM demo_route) AS start_lng,
    (SELECT end_location_name FROM demo_route) AS end_location_name,
    (SELECT end_lat FROM demo_route) AS end_lat,
    (SELECT end_lng FROM demo_route) AS end_lng,
    COALESCE((SELECT j FROM demo_stops), '[]'::jsonb) AS stops,
    true AS is_demo
  WHERE (SELECT count(*) FROM chosen) = 0
    AND (SELECT count(*) FROM demo_route) > 0
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_trip_map(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_trip_map(text) TO authenticated;


