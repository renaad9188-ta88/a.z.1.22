-- Public, PII-safe counters for homepage
-- Returns totals (people counts including companions) for upcoming arrivals/departures.

CREATE OR REPLACE FUNCTION public.get_public_trip_counters()
RETURNS TABLE (
  total_arrivals_people_count integer,
  total_departures_people_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      SELECT COALESCE(SUM(1 + COALESCE(vr.companions_count, 0)), 0)::int
      FROM public.visit_requests vr
      WHERE vr.status = 'approved'
        AND vr.arrival_date IS NOT NULL
        AND vr.arrival_date::date >= CURRENT_DATE
    ) AS total_arrivals_people_count,
    (
      SELECT COALESCE(SUM(1 + COALESCE(vr.companions_count, 0)), 0)::int
      FROM public.visit_requests vr
      WHERE vr.status = 'approved'
        AND vr.departure_date IS NOT NULL
        AND vr.departure_date::date >= CURRENT_DATE
    ) AS total_departures_people_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_trip_counters() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_trip_counters() TO authenticated;




