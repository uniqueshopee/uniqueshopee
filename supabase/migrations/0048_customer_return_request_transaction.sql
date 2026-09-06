-- Atomic customer return-request creation.
--
-- This is intentionally server-only. It validates the already-authenticated
-- customer identity, locks the order item using the mechanism established by
-- 0047, and inserts the return parent and item in one transaction.

create or replace function public.create_customer_return_request(
  p_user_id uuid,
  p_order_id uuid,
  p_order_item_id uuid,
  p_requested_quantity integer,
  p_customer_reason text,
  p_pickup_option text default null,
  p_pickup_location text default null
)
returns table (
  return_id uuid,
  status text,
  order_id uuid,
  order_item_id uuid,
  product_name text,
  requested_quantity integer,
  reason text,
  requested_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_product_attributes jsonb;
  v_active_quantity bigint;
  v_taxable_value numeric(12,2);
  v_gst_amount numeric(12,2);
  v_return_id uuid;
  v_requested_at timestamptz;
begin
  if p_user_id is null
     or p_order_id is null
     or p_order_item_id is null
     or p_requested_quantity is null
     or p_requested_quantity < 1
     or nullif(btrim(coalesce(p_customer_reason, '')), '') is null
     or length(btrim(p_customer_reason)) > 1000 then
    raise exception using errcode = 'P1001', message = 'RETURN_INVALID_INPUT';
  end if;

  select o.*
    into v_order
  from public.orders o
  where o.id = p_order_id
    and o.deleted_at is null;

  if not found then
    raise exception using errcode = 'P1002', message = 'RETURN_ORDER_NOT_FOUND';
  end if;

  if v_order.user_id is distinct from p_user_id then
    raise exception using errcode = 'P1003', message = 'RETURN_ORDER_NOT_OWNED';
  end if;

  if v_order.status <> 'delivered' then
    raise exception using errcode = 'P1004', message = 'RETURN_ORDER_NOT_DELIVERED';
  end if;

  if v_order.delivered_at is null or v_order.delivered_at > now() then
    raise exception using errcode = 'P1005', message = 'RETURN_DELIVERY_DATE_INVALID';
  end if;

  if now() > v_order.delivered_at + interval '5 days' then
    raise exception using errcode = 'P1006', message = 'RETURN_WINDOW_EXPIRED';
  end if;

  -- Use the same advisory-key convention as 0047 before checking quantity.
  perform pg_advisory_xact_lock(hashtextextended(p_order_item_id::text, 0));

  select oi.*
    into v_item
  from public.order_items oi
  where oi.id = p_order_item_id
    and oi.order_id = p_order_id
    and oi.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = 'P1007', message = 'RETURN_ITEM_NOT_IN_ORDER';
  end if;

  select p.attributes
    into v_product_attributes
  from public.products p
  where p.id = v_item.product_id
    and p.deleted_at is null;

  if not found
     or lower(coalesce(
          v_product_attributes->>'returnable',
          v_product_attributes->>'is_returnable',
          v_product_attributes->>'returnable_product',
          ''
        )) not in ('true', '1', 'yes', 'y', 'on') then
    raise exception using errcode = 'P1008', message = 'RETURN_PRODUCT_NOT_RETURNABLE';
  end if;

  if p_requested_quantity > v_item.quantity then
    raise exception using errcode = 'P1009', message = 'RETURN_QUANTITY_EXCEEDS_PURCHASE';
  end if;

  select coalesce(sum(ri.requested_quantity), 0)::bigint
    into v_active_quantity
  from public.return_items ri
  join public.returns r on r.id = ri.return_id
  where ri.order_item_id = p_order_item_id
    and r.status in (
      'RETURN_REQUESTED',
      'RETURN_APPROVED',
      'PICKUP_SCHEDULED',
      'PICKED_UP',
      'RECEIVED',
      'UNDER_INSPECTION',
      'REFUND_PENDING'
    );

  if v_active_quantity + p_requested_quantity > v_item.quantity then
    raise exception using errcode = 'P1010', message = 'RETURN_QUANTITY_NOT_AVAILABLE';
  end if;

  v_taxable_value := coalesce(
    v_item.taxable_value_snapshot,
    round(coalesce(v_item.unit_price, 0) * greatest(v_item.quantity, 1), 2)
  );
  v_gst_amount := coalesce(
    v_item.gst_amount_snapshot,
    round(v_taxable_value * greatest(coalesce(v_item.gst_rate, 0), 0) / 100, 2)
  );

  insert into public.returns (
    user_id,
    order_id,
    status,
    customer_reason,
    pickup_option,
    pickup_location
  ) values (
    p_user_id,
    p_order_id,
    'RETURN_REQUESTED',
    btrim(p_customer_reason),
    nullif(btrim(p_pickup_option), ''),
    nullif(btrim(p_pickup_location), '')
  )
  returning id, requested_at
    into v_return_id, v_requested_at;

  insert into public.return_items (
    return_id,
    order_item_id,
    requested_quantity,
    product_name_snapshot,
    unit_price_snapshot,
    discount_amount_snapshot,
    base_price_snapshot,
    shade_extra_price_snapshot,
    final_unit_price_snapshot,
    taxable_value_snapshot,
    gst_amount_snapshot,
    total_amount_snapshot
  ) values (
    v_return_id,
    v_item.id,
    p_requested_quantity,
    v_item.product_name_snapshot,
    coalesce(v_item.unit_price, 0),
    coalesce(v_item.discount_amount, 0),
    coalesce(v_item.base_price_snapshot, v_item.unit_price, 0),
    coalesce(v_item.shade_extra_price_snapshot, 0),
    coalesce(v_item.final_unit_price_snapshot, v_item.unit_price, 0),
    v_taxable_value,
    v_gst_amount,
    coalesce(v_item.total_amount, 0)
  );

  return query
  select
    v_return_id,
    'RETURN_REQUESTED'::text,
    p_order_id,
    v_item.id,
    v_item.product_name_snapshot,
    p_requested_quantity,
    btrim(p_customer_reason),
    v_requested_at;
end;
$$;

comment on function public.create_customer_return_request(uuid, uuid, uuid, integer, text, text, text) is
  'Server-only atomic customer return request creation. Validates ownership, eligibility, quantity, and snapshots before inserting returns and return_items in one transaction.';

revoke all on function public.create_customer_return_request(uuid, uuid, uuid, integer, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_customer_return_request(uuid, uuid, uuid, integer, text, text, text)
  to service_role;
