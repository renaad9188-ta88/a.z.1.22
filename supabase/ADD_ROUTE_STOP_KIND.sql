-- Add stop kind to route_stop_points so pickups and dropoffs can be different.
-- Values:
-- - pickup: نقاط الصعود (المغادرون)
-- - dropoff: نقاط النزول (القادمون)
-- - both: مشتركة (تظهر للطرفين)

ALTER TABLE public.route_stop_points
ADD COLUMN IF NOT EXISTS stop_kind text NOT NULL DEFAULT 'both';

ALTER TABLE public.route_stop_points
DROP CONSTRAINT IF EXISTS route_stop_points_stop_kind_check;

ALTER TABLE public.route_stop_points
ADD CONSTRAINT route_stop_points_stop_kind_check
CHECK (stop_kind IN ('pickup','dropoff','both'));

CREATE INDEX IF NOT EXISTS idx_route_stop_points_kind
ON public.route_stop_points(route_id, stop_kind, order_index);


