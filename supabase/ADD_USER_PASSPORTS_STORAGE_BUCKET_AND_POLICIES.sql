-- Create a private bucket for user passport images and add RLS policies.
-- Run in Supabase SQL Editor.

-- 1) Create bucket (private)
insert into storage.buckets (id, name, public)
values ('user_passports', 'user_passports', false)
on conflict (id) do update set public = excluded.public;

-- 2) Enable RLS on storage.objects (usually already enabled, but safe)
alter table storage.objects enable row level security;

-- Helper: admin check
-- NOTE: relies on public.profiles(role) where role = 'admin'

-- 3) Policies for authenticated users to manage only their own folder (auth.uid()/...)
drop policy if exists "User can list own passports" on storage.objects;
create policy "User can list own passports"
on storage.objects for select
to authenticated
using (
  bucket_id = 'user_passports'
  and (name like (auth.uid()::text || '/%'))
);

drop policy if exists "User can upload own passports" on storage.objects;
create policy "User can upload own passports"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'user_passports'
  and (name like (auth.uid()::text || '/%'))
);

drop policy if exists "User can delete own passports" on storage.objects;
create policy "User can delete own passports"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'user_passports'
  and (name like (auth.uid()::text || '/%'))
);

-- Optional: admin can view all user_passports (useful for support)
drop policy if exists "Admin can view all user passports" on storage.objects;
create policy "Admin can view all user passports"
on storage.objects for select
to authenticated
using (
  bucket_id = 'user_passports'
  and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
  )
);


