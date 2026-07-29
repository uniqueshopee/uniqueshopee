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
