create sequence if not exists public.order_number_sequence
  as bigint
  start with 1
  increment by 1
  no minvalue
  no maxvalue
  cache 1;

create or replace function public.generate_order_number()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  next_value bigint;
begin
  next_value := nextval('public.order_number_sequence');
  return 'US' || to_char(now(), 'YYYY') || lpad(next_value::text, 5, '0');
end;
$$;

alter table public.orders
  alter column order_number set default public.generate_order_number();

create or replace function public.create_checkout_order(
  p_shipping_address_id uuid default null,
  p_billing_address_id uuid default null,
  p_payment_method text default null,
  p_payment_reference text default null,
  p_shipping_total numeric default 0,
  p_coupon_code text default null,
  p_notes text default null,
  p_shipping_address_snapshot jsonb default null,
  p_billing_address_snapshot jsonb default null
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
  v_order_id uuid := gen_random_uuid();
  v_order_number text := public.generate_order_number();
  v_shipping_address_row public.addresses%rowtype;
  v_billing_address_row public.addresses%rowtype;
  v_shipping_snapshot jsonb := coalesce(p_shipping_address_snapshot, '{}'::jsonb);
  v_billing_snapshot jsonb := coalesce(p_billing_address_snapshot, '{}'::jsonb);
  v_coupon public.coupons%rowtype;
  v_cart_count integer := 0;
  v_processed_items integer := 0;
  v_subtotal numeric(12,2) := 0;
  v_discount_total numeric(12,2) := 0;
  v_coupon_discount numeric(12,2) := 0;
  v_tax_total numeric(12,2) := 0;
  v_total_amount numeric(12,2) := 0;
  v_shipping_amount numeric(12,2) := greatest(coalesce(p_shipping_total, 0), 0);
  v_payment_method text := nullif(trim(coalesce(p_payment_method, '')), '');
  v_payment_reference text := nullif(trim(coalesce(p_payment_reference, '')), '');
  v_cart_item record;
  v_line_item jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_inventory public.inventory%rowtype;
  v_base_amount numeric(12,2);
  v_line_discount numeric(12,2);
  v_line_tax numeric(12,2);
  v_coupon_base numeric(12,2);
  v_line_items jsonb := '[]'::jsonb;
  v_coupon_usage_count integer;
  v_user_coupon_usage_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if v_payment_method is null then
    raise exception 'Payment method is required' using errcode = 'P0001';
  end if;

  select *
  into v_shipping_address_row
  from public.addresses
  where id = p_shipping_address_id
    and user_id = v_user_id
    and deleted_at is null
  limit 1;

  if found then
    v_shipping_snapshot := jsonb_build_object(
      'name', v_shipping_address_row.full_name,
      'full_name', v_shipping_address_row.full_name,
      'phone', v_shipping_address_row.phone,
      'line1', v_shipping_address_row.line1,
      'line2', coalesce(v_shipping_address_row.line2, ''),
      'landmark', coalesce(v_shipping_address_row.landmark, ''),
      'area', coalesce(v_shipping_address_row.area, ''),
      'city', v_shipping_address_row.city,
      'state', v_shipping_address_row.state,
      'country', v_shipping_address_row.country,
      'pin_code', v_shipping_address_row.pin_code,
      'pincode', v_shipping_address_row.pin_code
    );
  elsif v_shipping_snapshot = '{}'::jsonb then
    raise exception 'Shipping address is required' using errcode = 'P0001';
  end if;

  select *
  into v_billing_address_row
  from public.addresses
  where id = p_billing_address_id
    and user_id = v_user_id
    and deleted_at is null
  limit 1;

  if found then
    v_billing_snapshot := jsonb_build_object(
      'name', v_billing_address_row.full_name,
      'full_name', v_billing_address_row.full_name,
      'phone', v_billing_address_row.phone,
      'line1', v_billing_address_row.line1,
      'line2', coalesce(v_billing_address_row.line2, ''),
      'landmark', coalesce(v_billing_address_row.landmark, ''),
      'area', coalesce(v_billing_address_row.area, ''),
      'city', v_billing_address_row.city,
      'state', v_billing_address_row.state,
      'country', v_billing_address_row.country,
      'pin_code', v_billing_address_row.pin_code,
      'pincode', v_billing_address_row.pin_code
    );
  elsif v_billing_snapshot = '{}'::jsonb then
    v_billing_snapshot := v_shipping_snapshot;
  end if;

  select count(*)
  into v_cart_count
  from public.cart_items
  where user_id = v_user_id
    and deleted_at is null;

  if coalesce(v_cart_count, 0) = 0 then
    raise exception 'Cart is empty' using errcode = 'P0001';
  end if;

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select *
    into v_coupon
    from public.coupons
    where lower(code) = lower(trim(p_coupon_code))
      and deleted_at is null
      and status = 'active'
      and (expiry_at is null or expiry_at > now())
    limit 1;

    if not found then
      raise exception 'Invalid coupon code' using errcode = 'P0001';
    end if;
  end if;

  for v_cart_item in
    select *
    from public.cart_items
    where user_id = v_user_id
      and deleted_at is null
    order by created_at asc
    for update
  loop
    select *
    into v_product
    from public.products
    where id = v_cart_item.product_id
      and deleted_at is null
    limit 1;

    if not found or v_product.status <> 'active' then
      raise exception 'One or more products are no longer available' using errcode = 'P0001';
    end if;

    if v_cart_item.product_variant_id is not null then
      select *
      into v_variant
      from public.product_variants
      where id = v_cart_item.product_variant_id
        and deleted_at is null
        and is_active = true
      limit 1;
    else
      select *
      into v_variant
      from public.product_variants
      where product_id = v_cart_item.product_id
        and deleted_at is null
        and is_active = true
      order by is_default desc, created_at asc
      limit 1;
    end if;

    if not found then
      raise exception 'Variant not available for one or more cart items' using errcode = 'P0001';
    end if;

    select *
    into v_inventory
    from public.inventory
    where product_variant_id = v_variant.id
      and deleted_at is null
    limit 1
    for update;

    if not found then
      raise exception 'Inventory record missing for one or more cart items' using errcode = 'P0001';
    end if;

    if greatest(coalesce(v_inventory.current_quantity, 0) - coalesce(v_inventory.reserved_quantity, 0), 0) < v_cart_item.quantity then
      raise exception 'Stock changed while checking out' using errcode = 'P0001';
    end if;

    v_base_amount := round(coalesce(v_cart_item.unit_price, v_product.selling_price) * v_cart_item.quantity, 2);
    v_line_discount := round(greatest(coalesce(v_product.mrp, coalesce(v_cart_item.unit_price, v_product.selling_price)) - coalesce(v_cart_item.unit_price, v_product.selling_price), 0) * v_cart_item.quantity, 2);
    v_line_tax := round(greatest(v_base_amount - v_line_discount, 0) * coalesce(v_product.gst_rate, 0) / 100, 2);

    v_subtotal := v_subtotal + v_base_amount;
    v_discount_total := v_discount_total + v_line_discount;
    v_tax_total := v_tax_total + v_line_tax;

    v_line_items := v_line_items || jsonb_build_array(
      jsonb_build_object(
        'inventory_id', v_inventory.id,
        'product_id', v_cart_item.product_id,
        'product_variant_id', v_variant.id,
        'sku_snapshot', v_variant.sku,
        'product_name_snapshot', v_product.name,
        'quantity', v_cart_item.quantity,
        'unit_price', round(coalesce(v_cart_item.unit_price, v_product.selling_price), 2),
        'discount_amount', v_line_discount,
        'gst_rate', coalesce(v_product.gst_rate, 0),
        'total_amount', round(greatest(v_base_amount - v_line_discount, 0) + v_line_tax, 2)
      )
    );

    v_processed_items := v_processed_items + 1;
  end loop;

  if v_processed_items = 0 then
    raise exception 'Cart is empty' using errcode = 'P0001';
  end if;

  if v_coupon.id is not null then
    v_coupon_base := greatest(v_subtotal - v_discount_total, 0);

    if v_coupon.minimum_order is not null and v_coupon_base < v_coupon.minimum_order then
      raise exception 'Coupon minimum order not met' using errcode = 'P0001';
    end if;

    select count(*) into v_coupon_usage_count
    from public.coupon_usage
    where coupon_id = v_coupon.id
      and deleted_at is null;

    if v_coupon.usage_limit is not null and v_coupon.usage_limit > 0 and v_coupon_usage_count >= v_coupon.usage_limit then
      raise exception 'Coupon usage limit reached' using errcode = 'P0001';
    end if;

    select count(*) into v_user_coupon_usage_count
    from public.coupon_usage
    where coupon_id = v_coupon.id
      and user_id = v_user_id
      and deleted_at is null;

    if v_coupon.per_user_limit is not null and v_coupon.per_user_limit > 0 and v_user_coupon_usage_count >= v_coupon.per_user_limit then
      raise exception 'Coupon already used' using errcode = 'P0001';
    end if;

    if v_coupon.coupon_type = 'percentage' then
      v_coupon_discount := round(least(v_coupon_base * (v_coupon.value / 100), case when coalesce(v_coupon.maximum_discount, 0) > 0 then v_coupon.maximum_discount else v_coupon_base end), 2);
    else
      v_coupon_discount := round(least(v_coupon.value, v_coupon_base), 2);
    end if;
  end if;

  v_total_amount := greatest(v_subtotal - v_discount_total - v_coupon_discount + v_tax_total + v_shipping_amount, 0);

  insert into public.orders (
    id,
    user_id,
    order_number,
    status,
    payment_status,
    payment_method,
    payment_reference,
    coupon_id,
    shipping_address_id,
    billing_address_id,
    shipping_address_snapshot,
    billing_address_snapshot,
    subtotal,
    discount_total,
    shipping_total,
    tax_total,
    total_amount,
    notes,
    placed_at
  ) values (
    v_order_id,
    v_user_id,
    v_order_number,
    'pending',
    'pending',
    v_payment_method,
    coalesce(v_payment_reference, v_payment_method),
    case when v_coupon.id is not null then v_coupon.id else null end,
    case when v_shipping_address_row.id is not null then v_shipping_address_row.id else null end,
    case when v_billing_address_row.id is not null then v_billing_address_row.id else null end,
    v_shipping_snapshot,
    v_billing_snapshot,
    round(v_subtotal, 2),
    round(v_discount_total, 2),
    round(v_shipping_amount, 2),
    round(v_tax_total, 2),
    round(v_total_amount, 2),
    nullif(trim(coalesce(p_notes, '')), ''),
    now()
  );

  for v_line_item in
    select value
    from jsonb_array_elements(v_line_items) as value
  loop
    insert into public.order_items (
      id,
      order_id,
      product_id,
      product_variant_id,
      sku_snapshot,
      product_name_snapshot,
      quantity,
      unit_price,
      discount_amount,
      gst_rate,
      total_amount
    ) values (
      gen_random_uuid(),
      v_order_id,
      (v_line_item ->> 'product_id')::uuid,
      (v_line_item ->> 'product_variant_id')::uuid,
      v_line_item ->> 'sku_snapshot',
      v_line_item ->> 'product_name_snapshot',
      (v_line_item ->> 'quantity')::integer,
      (v_line_item ->> 'unit_price')::numeric(12,2),
      (v_line_item ->> 'discount_amount')::numeric(12,2),
      (v_line_item ->> 'gst_rate')::numeric(5,2),
      (v_line_item ->> 'total_amount')::numeric(12,2)
    );

    update public.inventory
    set reserved_quantity = greatest(coalesce(reserved_quantity, 0) + (v_line_item ->> 'quantity')::integer, 0)
    where id = (v_line_item ->> 'inventory_id')::uuid;
  end loop;

  if v_coupon.id is not null and v_coupon_discount > 0 then
    insert into public.coupon_usage (
      id,
      coupon_id,
      user_id,
      order_id,
      discount_amount,
      used_at
    ) values (
      gen_random_uuid(),
      v_coupon.id,
      v_user_id,
      v_order_id,
      round(v_coupon_discount, 2),
      now()
    );
  end if;

  delete from public.cart_items
  where user_id = v_user_id;

  return query
  select v_order_id, v_order_number;
end;
$$;
