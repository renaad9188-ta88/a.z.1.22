-- Add time fields for trip schedule (optional but enables "date + time" on UI)
-- Safe to run multiple times.

ALTER TABLE public.visit_requests
  ADD COLUMN IF NOT EXISTS arrival_time time,
  ADD COLUMN IF NOT EXISTS departure_time time;

CREATE INDEX IF NOT EXISTS idx_visit_requests_arrival_time ON public.visit_requests(arrival_time);
CREATE INDEX IF NOT EXISTS idx_visit_requests_departure_time ON public.visit_requests(departure_time);


