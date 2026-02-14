-- Adds shareable tracking links for relatives (token-based, time-limited).
-- Usage (client):
--   select create_tracking_share_link(<request_id>, 48) -> token
--   select get_shared_tracking(<token>) -> json payload for public tracking page
--
-- Notes:
-- - We intentionally DO NOT open direct SELECT policies on sensitive tables for anon users.
-- - Public access is provided ONLY via SECURITY DEFINER RPC guarded by token expiry.

-- Ensure uuid generation is available
create extension if not exists pgcrypto;

-- Table: tracking_share_links
create table if not exists public.tracking_share_links (
  token uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.visit_requests(id) on delete cascade,
  created_by uuid null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.tracking_share_links enable row level security;

-- Only authenticated users (owner) or admin/supervisor can insert via SQL (optional).
-- Main creation path is RPC below.
drop policy if exists "tracking_share_links_insert_owner_or_admin" on public.tracking_share_links;
create policy "tracking_share_links_insert_owner_or_admin"
on public.tracking_share_links
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    exists (
      select 1 from public.visit_requests vr
      where vr.id = request_id and vr.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and lower(coalesce(p.role,'')) in ('admin','supervisor')
    )
  )
);

-- No SELECT policy for anon/authenticated (must use RPC). This prevents token enumeration.
drop policy if exists "tracking_share_links_no_select" on public.tracking_share_links;

-- RPC: create token for a request (48h default)
create or replace function public.create_tracking_share_link(p_request_id uuid, p_hours int default 48)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_role text;
  v_token uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select lower(coalesce(p.role,'')) into v_role
  from public.profiles p
  where p.user_id = v_uid
  order by p.updated_at desc
  limit 1;

  if not (
    exists (select 1 from public.visit_requests vr where vr.id = p_request_id and vr.user_id = v_uid)
    or v_role in ('admin','supervisor')
  ) then
    raise exception 'Not allowed';
  end if;

  insert into public.tracking_share_links(request_id, created_by, expires_at)
  values (p_request_id, v_uid, now() + make_interval(hours => greatest(1, least(720, p_hours))))
  returning token into v_token;

  return v_token;
end;
$$;

grant execute on function public.create_tracking_share_link(uuid, int) to authenticated;

-- RPC: get request_id for token (for internal use)
create or replace function public.get_tracking_share_request_id(p_token uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select request_id
  from public.tracking_share_links
  where token = p_token
    and expires_at > now()
  limit 1
$$;

grant execute on function public.get_tracking_share_request_id(uuid) to anon, authenticated;

-- RPC: return a minimal tracking snapshot for public share page
create or replace function public.get_shared_tracking(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req_id uuid;
  v_trip_id uuid;
  v_driver_id uuid;
  v_now timestamptz := now();
  j jsonb;
begin
  select request_id into v_req_id
  from public.tracking_share_links
  where token = p_token
    and expires_at > v_now
  limit 1;

  if v_req_id is null then
    return null;
  end if;

  -- request basics
  select (vr.trip_id)::uuid into v_trip_id
  from public.visit_requests vr
  where vr.id = v_req_id
  limit 1;

  -- driver id: prefer assigned_driver_id else first active route_trip_drivers for trip
  select
    coalesce(vr.assigned_driver_id, rtd.driver_id)
  into v_driver_id
  from public.visit_requests vr
  left join lateral (
    select driver_id
    from public.route_trip_drivers
    where trip_id = vr.trip_id
      and is_active = true
    limit 1
  ) rtd on true
  where vr.id = v_req_id
  limit 1;

  j := jsonb_build_object(
    'request', (
      select jsonb_build_object(
        'id', vr.id,
        'visitor_name', vr.visitor_name,
        'companions_count', coalesce(vr.companions_count, 0),
        'status', vr.status,
        'trip_status', vr.trip_status,
        'trip_id', vr.trip_id,
        'selected_dropoff_stop_id', vr.selected_dropoff_stop_id,
        'selected_pickup_stop_id', vr.selected_pickup_stop_id
      )
      from public.visit_requests vr
      where vr.id = v_req_id
      limit 1
    ),
    'trip', (
      select jsonb_build_object(
        'id', t.id,
        'route_id', t.route_id,
        'trip_date', t.trip_date,
        'meeting_time', t.meeting_time,
        'departure_time', t.departure_time,
        'trip_type', t.trip_type,
        'start_location_name', t.start_location_name,
        'start_lat', t.start_lat,
        'start_lng', t.start_lng,
        'end_location_name', t.end_location_name,
        'end_lat', t.end_lat,
        'end_lng', t.end_lng
      )
      from public.route_trips t
      where t.id = v_trip_id
      limit 1
    ),
    'stops', (
      select coalesce(
        (
          select jsonb_agg(jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'lat', s.lat,
            'lng', s.lng,
            'order_index', s.order_index
          ) order by s.order_index)
          from public.route_trip_stop_points s
          where s.trip_id = v_trip_id
        ),
        (
          -- Fallback to route default stops if trip has no specific stops
          select jsonb_agg(jsonb_build_object(
            'id', sp.id,
            'name', sp.name,
            'lat', sp.lat,
            'lng', sp.lng,
            'order_index', sp.order_index
          ) order by sp.order_index)
          from public.route_trips rt
          join public.route_stop_points sp on sp.route_id = rt.route_id
          where rt.id = v_trip_id
            and sp.is_active = true
            and (
              -- Filter by stop_kind based on trip_type (if stop_kind exists)
              sp.stop_kind is null
              or sp.stop_kind = 'both'
              or (rt.trip_type = 'arrival' and sp.stop_kind = 'dropoff')
              or (rt.trip_type = 'departure' and sp.stop_kind = 'pickup')
            )
        ),
        '[]'::jsonb
      )
    ),
    'driver', (
      select jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'phone', d.phone,
        'vehicle_type', d.vehicle_type
      )
      from public.drivers d
      where d.id = v_driver_id
      limit 1
    ),
    'live', (
      select jsonb_build_object(
        'lat', ls.lat,
        'lng', ls.lng,
        'updated_at', ls.updated_at,
        'is_available', ls.is_available
      )
      from public.driver_live_status ls
      where ls.driver_id = v_driver_id
        and ls.is_available = true
      limit 1
    )
  );

  return j;
end;
$$;

grant execute on function public.get_shared_tracking(uuid) to anon, authenticated;


