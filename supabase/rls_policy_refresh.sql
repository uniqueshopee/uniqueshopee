-- UniqueShopee RLS policy refresh
-- Safe to run on an existing database:
-- - does not drop tables
-- - does not delete data
-- - does not modify schema
-- - can be run multiple times

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.profile_roles pr
    join public.roles r on r.id = pr.role_id
    where pr.profile_id = auth.uid()
      and pr.deleted_at is null
      and r.deleted_at is null
      and r.key in ('admin', 'manager', 'staff')
  )
  or exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid()
      and p.deleted_at is null
      and r.deleted_at is null
      and r.key in ('admin', 'manager', 'staff')
  );
$$;

create or replace function public.owns_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = target_order_id
      and o.user_id = auth.uid()
      and o.deleted_at is null
  );
$$;

create or replace function public.owns_ticket(target_ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.support_tickets t
    where t.id = target_ticket_id
      and t.user_id = auth.uid()
      and t.deleted_at is null
  );
$$;

do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'roles',
        'profiles',
        'profile_roles',
        'departments',
        'categories',
        'brands',
        'products',
        'product_images',
        'product_variants',
        'inventory',
        'addresses',
        'cart_items',
        'wishlist_items',
        'coupons',
        'orders',
        'order_items',
        'reviews',
        'coupon_usage',
        'notifications',
        'banners',
        'support_tickets',
        'support_ticket_replies',
        'paint_calculations',
        'room_visualizations',
        'settings'
      )
  loop
    execute format('drop policy if exists %I on public.%I;', pol.policyname, pol.tablename);
  end loop;
end;
$$;

drop policy if exists roles_admin_manage on public.roles;
create policy roles_admin_manage
on public.roles
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists profiles_self_or_admin_select on public.profiles;
create policy profiles_self_or_admin_select
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists profiles_self_or_admin_insert on public.profiles;
create policy profiles_self_or_admin_insert
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists profiles_self_or_admin_update on public.profiles;
create policy profiles_self_or_admin_update
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete
on public.profiles
for delete
using (auth.uid() = id);

drop policy if exists profile_roles_admin_manage on public.profile_roles;
create policy profile_roles_admin_manage
on public.profile_roles
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists departments_public_select on public.departments;
create policy departments_public_select
on public.departments
for select
using (deleted_at is null and coalesce(is_active, true) = true);

drop policy if exists departments_admin_manage on public.departments;
create policy departments_admin_manage
on public.departments
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists categories_public_select on public.categories;
create policy categories_public_select
on public.categories
for select
using (deleted_at is null and coalesce(is_active, true) = true);

drop policy if exists categories_admin_manage on public.categories;
create policy categories_admin_manage
on public.categories
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists brands_public_select on public.brands;
create policy brands_public_select
on public.brands
for select
using (deleted_at is null and coalesce(is_active, true) = true);

drop policy if exists brands_admin_manage on public.brands;
create policy brands_admin_manage
on public.brands
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists products_public_select on public.products;
create policy products_public_select
on public.products
for select
using (deleted_at is null and status = 'active');

drop policy if exists products_admin_manage on public.products;
create policy products_admin_manage
on public.products
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists product_images_public_select on public.product_images;
create policy product_images_public_select
on public.product_images
for select
using (deleted_at is null);

drop policy if exists product_images_admin_manage on public.product_images;
create policy product_images_admin_manage
on public.product_images
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists product_variants_public_select on public.product_variants;
create policy product_variants_public_select
on public.product_variants
for select
using (deleted_at is null and is_active = true);

drop policy if exists product_variants_admin_manage on public.product_variants;
create policy product_variants_admin_manage
on public.product_variants
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists inventory_public_select on public.inventory;
create policy inventory_public_select
on public.inventory
for select
using (deleted_at is null);

drop policy if exists inventory_admin_manage on public.inventory;
create policy inventory_admin_manage
on public.inventory
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists addresses_owner_select on public.addresses;
create policy addresses_owner_select
on public.addresses
for select
using (auth.uid() = user_id);

drop policy if exists addresses_owner_insert on public.addresses;
create policy addresses_owner_insert
on public.addresses
for insert
with check (auth.uid() = user_id);

drop policy if exists addresses_owner_update on public.addresses;
create policy addresses_owner_update
on public.addresses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists addresses_owner_delete on public.addresses;
create policy addresses_owner_delete
on public.addresses
for delete
using (auth.uid() = user_id);

drop policy if exists cart_items_owner_select on public.cart_items;
create policy cart_items_owner_select
on public.cart_items
for select
using (auth.uid() = user_id);

drop policy if exists cart_items_owner_insert on public.cart_items;
create policy cart_items_owner_insert
on public.cart_items
for insert
with check (auth.uid() = user_id);

drop policy if exists cart_items_owner_update on public.cart_items;
create policy cart_items_owner_update
on public.cart_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists cart_items_owner_delete on public.cart_items;
create policy cart_items_owner_delete
on public.cart_items
for delete
using (auth.uid() = user_id);

drop policy if exists wishlist_items_owner_select on public.wishlist_items;
create policy wishlist_items_owner_select
on public.wishlist_items
for select
using (auth.uid() = user_id);

drop policy if exists wishlist_items_owner_insert on public.wishlist_items;
create policy wishlist_items_owner_insert
on public.wishlist_items
for insert
with check (auth.uid() = user_id);

drop policy if exists wishlist_items_owner_update on public.wishlist_items;
create policy wishlist_items_owner_update
on public.wishlist_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists wishlist_items_owner_delete on public.wishlist_items;
create policy wishlist_items_owner_delete
on public.wishlist_items
for delete
using (auth.uid() = user_id);

drop policy if exists coupons_public_select on public.coupons;
create policy coupons_public_select
on public.coupons
for select
using (deleted_at is null and status = 'active' and (expiry_at is null or expiry_at > now()));

drop policy if exists coupons_admin_manage on public.coupons;
create policy coupons_admin_manage
on public.coupons
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists orders_owner_select on public.orders;
create policy orders_owner_select
on public.orders
for select
using (auth.uid() = user_id or public.is_admin_user());

drop policy if exists orders_owner_insert on public.orders;
create policy orders_owner_insert
on public.orders
for insert
with check (auth.uid() = user_id);

drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update
on public.orders
for update
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists orders_admin_delete on public.orders;
create policy orders_admin_delete
on public.orders
for delete
using (public.is_admin_user());

drop policy if exists order_items_owner_select on public.order_items;
create policy order_items_owner_select
on public.order_items
for select
using (public.owns_order(order_id));

drop policy if exists order_items_admin_manage on public.order_items;
create policy order_items_admin_manage
on public.order_items
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists reviews_owner_or_public_select on public.reviews;
create policy reviews_owner_or_public_select
on public.reviews
for select
using (auth.uid() = user_id);

drop policy if exists reviews_owner_insert on public.reviews;
create policy reviews_owner_insert
on public.reviews
for insert
with check (auth.uid() = user_id);

drop policy if exists reviews_owner_update on public.reviews;
create policy reviews_owner_update
on public.reviews
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists reviews_owner_delete on public.reviews;
create policy reviews_owner_delete
on public.reviews
for delete
using (auth.uid() = user_id);

drop policy if exists coupon_usage_owner_select on public.coupon_usage;
create policy coupon_usage_owner_select
on public.coupon_usage
for select
using (auth.uid() = user_id);

drop policy if exists coupon_usage_admin_manage on public.coupon_usage;
create policy coupon_usage_admin_manage
on public.coupon_usage
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists notifications_owner_select on public.notifications;
create policy notifications_owner_select
on public.notifications
for select
using (auth.uid() = user_id);

drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update
on public.notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists notifications_owner_delete on public.notifications;
create policy notifications_owner_delete
on public.notifications
for delete
using (auth.uid() = user_id);

drop policy if exists banners_public_select on public.banners;
create policy banners_public_select
on public.banners
for select
using (
  deleted_at is null
  and is_active = true
  and (start_at is null or start_at <= now())
  and (end_at is null or end_at >= now())
);

drop policy if exists banners_admin_manage on public.banners;
create policy banners_admin_manage
on public.banners
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists support_tickets_owner_select on public.support_tickets;
create policy support_tickets_owner_select
on public.support_tickets
for select
using (auth.uid() = user_id);

drop policy if exists support_tickets_owner_insert on public.support_tickets;
create policy support_tickets_owner_insert
on public.support_tickets
for insert
with check (auth.uid() = user_id);

drop policy if exists support_tickets_owner_update on public.support_tickets;
create policy support_tickets_owner_update
on public.support_tickets
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists support_tickets_owner_delete on public.support_tickets;
create policy support_tickets_owner_delete
on public.support_tickets
for delete
using (auth.uid() = user_id);

drop policy if exists support_ticket_replies_owner_select on public.support_ticket_replies;
create policy support_ticket_replies_owner_select
on public.support_ticket_replies
for select
using (public.owns_ticket(ticket_id));

drop policy if exists support_ticket_replies_owner_insert on public.support_ticket_replies;
create policy support_ticket_replies_owner_insert
on public.support_ticket_replies
for insert
with check (public.owns_ticket(ticket_id));

drop policy if exists support_ticket_replies_admin_update on public.support_ticket_replies;
create policy support_ticket_replies_admin_update
on public.support_ticket_replies
for update
using (public.owns_ticket(ticket_id))
with check (public.owns_ticket(ticket_id));

drop policy if exists support_ticket_replies_admin_delete on public.support_ticket_replies;
create policy support_ticket_replies_admin_delete
on public.support_ticket_replies
for delete
using (public.owns_ticket(ticket_id));

drop policy if exists paint_calculations_owner_select on public.paint_calculations;
create policy paint_calculations_owner_select
on public.paint_calculations
for select
using (auth.uid() = user_id);

drop policy if exists paint_calculations_owner_insert on public.paint_calculations;
create policy paint_calculations_owner_insert
on public.paint_calculations
for insert
with check (auth.uid() = user_id);

drop policy if exists paint_calculations_owner_update on public.paint_calculations;
create policy paint_calculations_owner_update
on public.paint_calculations
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists paint_calculations_owner_delete on public.paint_calculations;
create policy paint_calculations_owner_delete
on public.paint_calculations
for delete
using (auth.uid() = user_id);

drop policy if exists room_visualizations_owner_select on public.room_visualizations;
create policy room_visualizations_owner_select
on public.room_visualizations
for select
using (auth.uid() = user_id);

drop policy if exists room_visualizations_owner_insert on public.room_visualizations;
create policy room_visualizations_owner_insert
on public.room_visualizations
for insert
with check (auth.uid() = user_id);

drop policy if exists room_visualizations_owner_update on public.room_visualizations;
create policy room_visualizations_owner_update
on public.room_visualizations
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists room_visualizations_owner_delete on public.room_visualizations;
create policy room_visualizations_owner_delete
on public.room_visualizations
for delete
using (auth.uid() = user_id);

drop policy if exists settings_public_select on public.settings;
create policy settings_public_select
on public.settings
for select
using (is_public = true or public.is_admin_user());

drop policy if exists settings_admin_manage on public.settings;
create policy settings_admin_manage
on public.settings
for all
using (public.is_admin_user())
with check (public.is_admin_user());
