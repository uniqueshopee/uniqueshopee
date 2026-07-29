insert into storage.buckets (id, name, public)
values
  ('products', 'products', true),
  ('brands', 'brands', true),
  ('categories', 'categories', true),
  ('users', 'users', false),
  ('banners', 'banners', true),
  ('documents', 'documents', false),
  ('room-visualizer', 'room-visualizer', false),
  ('support', 'support', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists storage_public_read_assets on storage.objects;
create policy storage_public_read_assets
on storage.objects
for select
using (bucket_id in ('products', 'brands', 'categories', 'banners'));

drop policy if exists storage_admin_manage_assets on storage.objects;
create policy storage_admin_manage_assets
on storage.objects
for all
using (
  bucket_id in ('products', 'brands', 'categories', 'banners')
  and public.is_admin_user()
)
with check (
  bucket_id in ('products', 'brands', 'categories', 'banners')
  and public.is_admin_user()
);

drop policy if exists storage_user_private_objects on storage.objects;
create policy storage_user_private_objects
on storage.objects
for all
using (
  auth.uid() is not null
  and bucket_id in ('users', 'documents', 'room-visualizer', 'support')
  and name like auth.uid()::text || '/%'
)
with check (
  auth.uid() is not null
  and bucket_id in ('users', 'documents', 'room-visualizer', 'support')
  and name like auth.uid()::text || '/%'
);

drop policy if exists storage_admin_manage_private_objects on storage.objects;
create policy storage_admin_manage_private_objects
on storage.objects
for all
using (public.is_admin_user())
with check (public.is_admin_user());
