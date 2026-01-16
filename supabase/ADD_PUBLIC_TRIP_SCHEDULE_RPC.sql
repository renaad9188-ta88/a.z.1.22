-- Public, PII-safe schedule list for homepage dropdowns
-- Returns upcoming trip dates (and times if set) with aggregated people counts.

CREATE OR REPLACE FUNCTION public.get_public_trip_schedule(p_kind text, p_limit int DEFAULT 5)
RETURNS TABLE (
  trip_date date,
  trip_time time,
  people_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      CASE
        WHEN lower(p_kind) = 'arrivals' THEN vr.arrival_date::date
        ELSE vr.departure_date::date
      END AS d,
      CASE
        WHEN lower(p_kind) = 'arrivals' THEN vr.arrival_time
        ELSE vr.departure_time
      END AS t,
      (1 + COALESCE(vr.companions_count, 0))::int AS people
    FROM public.visit_requests vr
    WHERE vr.status = 'approved'
      AND (
        (lower(p_kind) = 'arrivals' AND vr.arrival_date IS NOT NULL)
        OR (lower(p_kind) = 'departures' AND vr.departure_date IS NOT NULL)
      )
      AND (
        CASE
          WHEN lower(p_kind) = 'arrivals' THEN vr.arrival_date::date
          ELSE vr.departure_date::date
        END
      ) >= CURRENT_DATE
  ),
  grouped AS (
    SELECT d, t, SUM(people)::int AS people_count
    FROM base
    WHERE d IS NOT NULL
    GROUP BY d, t
  )
  SELECT d AS trip_date, t AS trip_time, people_count
  FROM grouped
  ORDER BY trip_date ASC, trip_time ASC NULLS LAST
  LIMIT GREATEST(1, LEAST(p_limit, 20));
$$;

GRANT EXECUTE ON FUNCTION public.get_public_trip_schedule(text, int) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_trip_schedule(text, int) TO authenticated;


