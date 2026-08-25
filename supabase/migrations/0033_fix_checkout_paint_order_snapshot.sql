-- Copy the authoritative cart paint configuration into each order line while
-- leaving checkout pricing, coupons, shipping, inventory, and authorization
-- unchanged.
create or replace function public.create_checkout_order(
  p_shipping_address_id uuid default null,
  p_billing_address_id uuid default null,
  p_payment_method text default null,
  p_payment_reference text default null,
  p_payment_status text default null,
  p_coupon_code text default null,
  p_notes text default null,
  p_shipping_address_snapshot jsonb default null,
  p_billing_address_snapshot jsonb default null
)
returns table (order_id uuid, order_number text)
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
  v_coupon_id uuid;
  v_subtotal numeric(12,2);
  v_discount_total numeric(12,2);
  v_coupon_discount numeric(12,2);
  v_taxable_amount numeric(12,2);
  v_tax_total numeric(12,2);
  v_shipping_total numeric(12,2);
  v_total_amount numeric(12,2);
  v_item_count integer;
  v_line_items jsonb;
  v_line_item jsonb;
  v_cart_item public.cart_items%rowtype;
  v_payment_method text := nullif(trim(coalesce(p_payment_method, '')), '');
  v_payment_reference text := nullif(trim(coalesce(p_payment_reference, '')), '');
  v_coupon_usage_count integer;
  v_user_coupon_usage_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if v_payment_method is null then
    raise exception 'Payment method is required' using errcode = 'P0001';
  end if;

  select * into v_shipping_address_row
  from public.addresses
  where id = p_shipping_address_id and user_id = v_user_id and deleted_at is null
  limit 1;
  if found then
    v_shipping_snapshot := jsonb_build_object(
      'name', v_shipping_address_row.full_name, 'full_name', v_shipping_address_row.full_name,
      'phone', v_shipping_address_row.phone, 'line1', v_shipping_address_row.line1,
      'line2', coalesce(v_shipping_address_row.line2, ''), 'landmark', coalesce(v_shipping_address_row.landmark, ''),
      'area', coalesce(v_shipping_address_row.area, ''), 'city', v_shipping_address_row.city,
      'state', v_shipping_address_row.state, 'country', v_shipping_address_row.country,
      'pin_code', v_shipping_address_row.pin_code, 'pincode', v_shipping_address_row.pin_code
    );
  elsif v_shipping_snapshot = '{}'::jsonb then
    raise exception 'Shipping address is required' using errcode = 'P0001';
  end if;

  select * into v_billing_address_row
  from public.addresses
  where id = p_billing_address_id and user_id = v_user_id and deleted_at is null
  limit 1;
  if found then
    v_billing_snapshot := jsonb_build_object(
      'name', v_billing_address_row.full_name, 'full_name', v_billing_address_row.full_name,
      'phone', v_billing_address_row.phone, 'line1', v_billing_address_row.line1,
      'line2', coalesce(v_billing_address_row.line2, ''), 'landmark', coalesce(v_billing_address_row.landmark, ''),
      'area', coalesce(v_billing_address_row.area, ''), 'city', v_billing_address_row.city,
      'state', v_billing_address_row.state, 'country', v_billing_address_row.country,
      'pin_code', v_billing_address_row.pin_code, 'pincode', v_billing_address_row.pin_code
    );
  elsif v_billing_snapshot = '{}'::jsonb then
    v_billing_snapshot := v_shipping_snapshot;
  end if;

  select coupon_id, subtotal, discount_total, coupon_discount, taxable_amount,
    tax_total, shipping_total, total_amount, item_count, line_items
  into v_coupon_id, v_subtotal, v_discount_total, v_coupon_discount, v_taxable_amount,
    v_tax_total, v_shipping_total, v_total_amount, v_item_count, v_line_items
  from public.calculate_checkout_pricing(p_coupon_code);
  if coalesce(v_item_count, 0) = 0 then
    raise exception 'Cart is empty' using errcode = 'P0001';
  end if;

  if v_coupon_id is not null then
    select * into v_coupon from public.coupons
    where id = v_coupon_id and deleted_at is null limit 1;
    if not found then raise exception 'Invalid coupon code' using errcode = 'P0001'; end if;

    select count(*) into v_coupon_usage_count from public.coupon_usage
    where coupon_id = v_coupon.id and deleted_at is null;
    if v_coupon.usage_limit is not null and v_coupon.usage_limit > 0 and v_coupon_usage_count >= v_coupon.usage_limit then
      raise exception 'Coupon usage limit reached' using errcode = 'P0001';
    end if;

    select count(*) into v_user_coupon_usage_count from public.coupon_usage
    where coupon_id = v_coupon.id and user_id = v_user_id and deleted_at is null;
    if v_coupon.per_user_limit is not null and v_coupon.per_user_limit > 0 and v_user_coupon_usage_count >= v_coupon.per_user_limit then
      raise exception 'Coupon already used' using errcode = 'P0001';
    end if;
  end if;

  insert into public.orders (
    id, user_id, order_number, status, payment_status, payment_method, payment_reference,
    coupon_id, shipping_address_id, billing_address_id, shipping_address_snapshot,
    billing_address_snapshot, subtotal, discount_total, shipping_total, tax_total,
    total_amount, notes, placed_at
  ) values (
    v_order_id, v_user_id, v_order_number, 'pending', coalesce(p_payment_status, 'pending'), v_payment_method,
    coalesce(v_payment_reference, v_payment_method), v_coupon_id,
    case when v_shipping_address_row.id is not null then v_shipping_address_row.id else null end,
    case when v_billing_address_row.id is not null then v_billing_address_row.id else null end,
    v_shipping_snapshot, v_billing_snapshot, v_subtotal,
    v_discount_total + v_coupon_discount, v_shipping_total,
    v_tax_total, v_total_amount, nullif(trim(coalesce(p_notes, '')), ''), now()
  );

  for v_line_item in select value from jsonb_array_elements(v_line_items) as value loop
    select * into v_cart_item
    from public.cart_items
    where user_id = v_user_id
      and product_id = (v_line_item ->> 'product_id')::uuid
      and product_variant_id = (v_line_item ->> 'product_variant_id')::uuid
      and coalesce(shade_id, '00000000-0000-0000-0000-000000000000'::uuid) =
          coalesce(nullif(v_line_item ->> 'shade_id', '')::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
      and deleted_at is null
    order by created_at desc
    limit 1;

    insert into public.order_items (
      id, order_id, product_id, product_variant_id, shade_id, shade_code_snapshot,
      shade_name_snapshot, colour_family_snapshot, hex_color_snapshot, base_id,
      base_name_snapshot, pack_size_snapshot, finish_snapshot, base_price_snapshot,
      shade_extra_price_snapshot, final_unit_price_snapshot, sku_snapshot,
      product_name_snapshot, quantity, unit_price, discount_amount, gst_rate, total_amount
    ) values (
      gen_random_uuid(), v_order_id, (v_line_item ->> 'product_id')::uuid,
      (v_line_item ->> 'product_variant_id')::uuid,
      coalesce(v_cart_item.shade_id, nullif(v_line_item ->> 'shade_id', '')::uuid),
      coalesce(v_cart_item.shade_code_snapshot, v_line_item ->> 'shade_code_snapshot'),
      coalesce(v_cart_item.shade_name_snapshot, v_line_item ->> 'shade_name_snapshot'),
      v_cart_item.colour_family_snapshot,
      v_cart_item.hex_color_snapshot,
      v_cart_item.base_id,
      v_cart_item.base_name_snapshot,
      coalesce(v_cart_item.pack_size_snapshot, v_line_item ->> 'pack_size_snapshot'),
      coalesce(v_cart_item.finish_snapshot, v_line_item ->> 'finish_snapshot'),
      nullif(v_line_item ->> 'base_price_snapshot', '')::numeric(12,2),
      nullif(v_line_item ->> 'shade_extra_price_snapshot', '')::numeric(12,2),
      nullif(v_line_item ->> 'final_unit_price_snapshot', '')::numeric(12,2),
      coalesce(v_cart_item.sku_snapshot, v_line_item ->> 'sku_snapshot'),
      v_line_item ->> 'product_name_snapshot', (v_line_item ->> 'quantity')::integer,
      (v_line_item ->> 'unit_price')::numeric(12,2), (v_line_item ->> 'discount_amount')::numeric(12,2),
      (v_line_item ->> 'gst_rate')::numeric(5,2), (v_line_item ->> 'total_amount')::numeric(12,2)
    );

    update public.inventory
    set reserved_quantity = greatest(coalesce(reserved_quantity, 0) + (v_line_item ->> 'quantity')::integer, 0)
    where id = (v_line_item ->> 'inventory_id')::uuid;
  end loop;

  if v_coupon_id is not null and v_coupon_discount > 0 then
    insert into public.coupon_usage (id, coupon_id, user_id, order_id, discount_amount)
    values (gen_random_uuid(), v_coupon_id, v_user_id, v_order_id, v_coupon_discount);
  end if;

  return query select v_order_id, v_order_number;
end;
$$;
