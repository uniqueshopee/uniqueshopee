create or replace function public.cancel_order(
  p_order_id uuid
)
returns table (
  order_id uuid,
  order_number text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_item record;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
    and user_id = v_user_id
    and deleted_at is null
  limit 1
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0001';
  end if;

  if lower(coalesce(v_order.status, '')) not in ('pending', 'confirmed', 'packed', 'processing') then
    raise exception 'Order can no longer be cancelled because it has already been shipped.' using errcode = 'P0001';
  end if;

  update public.orders
  set status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  where id = v_order.id;

  for v_item in
    select oi.product_variant_id, oi.quantity
    from public.order_items as oi
    where oi.order_id = v_order.id
      and oi.deleted_at is null
  loop
    if v_item.product_variant_id is not null then
      update public.inventory
      set reserved_quantity = greatest(coalesce(reserved_quantity, 0) - coalesce(v_item.quantity, 0), 0),
          updated_at = now()
      where product_variant_id = v_item.product_variant_id
        and deleted_at is null;
    end if;
  end loop;

  return query
  select v_order.id, v_order.order_number;
end;
$$;
