-- Make the selected shade the source of any shade surcharge during checkout.
-- Existing columns and snapshot fields remain unchanged for backward compatibility.

create or replace function public.resolve_paint_configuration_price(
  p_variant_id uuid,
  p_shade_id uuid default null
)
returns table (
  base_price numeric(12,2),
  shade_adjustment numeric(12,2),
  final_price numeric(12,2),
  rule_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_variant public.product_variants%rowtype;
  v_product public.products%rowtype;
  v_shade public.shades%rowtype;
  v_rule public.paint_pricing_rules%rowtype;
  v_base numeric(12,2);
  v_adjustment numeric(12,2);
begin
  select * into v_variant
  from public.product_variants
  where id = p_variant_id
    and deleted_at is null
    and is_active = true
    and is_available = true;
  if not found then
    raise exception 'Variant is not available';
  end if;

  select * into v_product
  from public.products
  where id = v_variant.product_id
    and deleted_at is null;
  if not found then
    raise exception 'Product is not available';
  end if;

  if p_shade_id is not null then
    select * into v_shade
    from public.shades
    where id = p_shade_id
      and deleted_at is null
      and is_active = true;
    if not found then
      raise exception 'Selected shade is no longer available';
    end if;
  end if;

  select * into v_rule
  from public.paint_pricing_rules r
  where r.product_id = v_variant.product_id
    and r.deleted_at is null
    and r.is_active = true
    and (r.product_variant_id is null or r.product_variant_id = v_variant.id)
    and (r.shade_id is null or r.shade_id = p_shade_id)
    and (r.colour_family is null or lower(r.colour_family) = lower(coalesce(v_shade.color_family, '')))
    and (r.tone is null or lower(r.tone) = lower(coalesce(v_shade.tone, '')))
    and (r.depth is null or lower(r.depth) = lower(coalesce(v_shade.depth, '')))
    and (r.finish is null or lower(r.finish) = lower(coalesce(v_variant.finish, '')))
    and (r.pack_size is null or r.pack_size = v_variant.pack_size)
  order by
    case when r.product_variant_id is not null then 32 else 0 end +
    case when r.shade_id is not null then 16 else 0 end +
    case when r.colour_family is not null then 8 else 0 end +
    case when r.tone is not null or r.depth is not null then 4 else 0 end +
    case when r.finish is not null then 2 else 0 end +
    case when r.pack_size is not null then 1 else 0 end desc,
    r.priority desc,
    r.updated_at desc
  limit 1;

  v_base := round(greatest(coalesce(v_variant.base_price, v_variant.selling_price_override, v_product.selling_price, 0), 0), 2);

  if v_rule.id is null then
    -- A selected shade with no applicable rule has no surcharge. The legacy
    -- variant surcharge is retained only for non-shade configurations.
    if p_shade_id is null then
      v_adjustment := round(greatest(coalesce(v_variant.shade_extra_price, 0), 0), 2);
      if coalesce(v_variant.adjustment_type, 'fixed') = 'none' then
        v_adjustment := 0;
      elsif coalesce(v_variant.adjustment_type, 'fixed') = 'percentage' then
        v_adjustment := round(v_base * v_adjustment / 100, 2);
      end if;
    else
      v_adjustment := 0;
    end if;
    return query select v_base, v_adjustment, round(v_base + v_adjustment, 2), null::uuid;
  elsif v_rule.override_price is not null then
    return query select v_base, round(greatest(v_rule.adjustment_value, 0), 2), round(v_rule.override_price, 2), v_rule.id;
  else
    v_adjustment := case
      when v_rule.adjustment_type = 'none' then 0
      when v_rule.adjustment_type = 'percentage' then round(v_base * greatest(v_rule.adjustment_value, 0) / 100, 2)
      else round(greatest(v_rule.adjustment_value, 0), 2)
    end;
    return query select v_base, v_adjustment, round(v_base + v_adjustment, 2), v_rule.id;
  end if;
end;
$$;

comment on function public.resolve_paint_configuration_price(uuid, uuid) is
'Resolves canonical paint pricing using the selected shade and existing paint_pricing_rules hierarchy. product_variants.shade_extra_price is only a legacy fallback when no shade is selected.';

create or replace function public.calculate_checkout_pricing(
  p_coupon_code text default null
)
returns table (
  coupon_id uuid,
  coupon_code text,
  subtotal numeric(12,2),
  discount_total numeric(12,2),
  coupon_discount numeric(12,2),
  taxable_amount numeric(12,2),
  tax_total numeric(12,2),
  shipping_total numeric(12,2),
  total_amount numeric(12,2),
  item_count integer,
  line_items jsonb
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_coupon public.coupons%rowtype;
  v_cart_item record;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_inventory public.inventory%rowtype;
  v_shade public.shades%rowtype;
  v_base_price numeric(12,2);
  v_shade_extra numeric(12,2);
  v_unit_taxable numeric(12,2);
  v_line_taxable numeric(12,2);
  v_line_tax numeric(12,2);
  v_line_total numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_tax_total numeric(12,2) := 0;
  v_taxable_amount numeric(12,2) := 0;
  v_shipping_total numeric(12,2) := 0;
  v_coupon_discount numeric(12,2) := 0;
  v_total_amount numeric(12,2) := 0;
  v_item_count integer := 0;
  v_coupon_code_value text := null;
  v_line_items jsonb := '[]'::jsonb;
  v_selected_shade_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if nullif(trim(p_coupon_code), '') is not null then
    select * into v_coupon
    from public.coupons
    where lower(code) = lower(trim(p_coupon_code))
      and deleted_at is null
      and status = 'active'
      and (start_at is null or start_at <= now())
      and (expiry_at is null or expiry_at > now())
    limit 1;
    if not found then
      raise exception 'Invalid coupon code' using errcode = 'P0001';
    end if;
    v_coupon_code_value := v_coupon.code;
  end if;

  for v_cart_item in
    select * from public.cart_items
    where user_id = v_user_id and deleted_at is null
    order by created_at asc
    for update
  loop
    select * into v_product from public.products
    where id = v_cart_item.product_id and status = 'active' and deleted_at is null;
    if not found then raise exception 'One or more products are no longer available' using errcode = 'P0001'; end if;

    if v_cart_item.product_variant_id is not null then
      select * into v_variant from public.product_variants
      where id = v_cart_item.product_variant_id
        and product_id = v_cart_item.product_id
        and deleted_at is null and is_active = true and is_available = true;
    else
      select * into v_variant from public.product_variants
      where product_id = v_cart_item.product_id
        and deleted_at is null and is_active = true and is_available = true
      order by is_default desc, created_at asc limit 1;
    end if;
    if not found then raise exception 'Variant not available for one or more cart items' using errcode = 'P0001'; end if;

    v_selected_shade_id := coalesce(v_cart_item.shade_id, v_variant.shade_id);
    v_shade := null;
    if v_selected_shade_id is not null then
      select * into v_shade from public.shades
      where id = v_selected_shade_id and deleted_at is null and is_active = true;
      if not found then raise exception 'Selected shade is no longer available' using errcode = 'P0001'; end if;
      if not exists (
        select 1 from public.product_shades ps
        where ps.product_id = v_product.id and ps.shade_id = v_selected_shade_id
          and ps.deleted_at is null and ps.is_available = true
          and (ps.finish is null or lower(ps.finish) = lower(coalesce(v_variant.finish, v_cart_item.finish_snapshot, '')))
      ) then
        raise exception 'Selected shade is not available for this product and finish' using errcode = 'P0001';
      end if;
    end if;

    select * into v_inventory from public.inventory
    where product_variant_id = v_variant.id and deleted_at is null
    limit 1 for update;
    if not found then raise exception 'Inventory record missing for one or more cart items' using errcode = 'P0001'; end if;
    if greatest(coalesce(v_inventory.current_quantity, 0) - coalesce(v_inventory.reserved_quantity, 0), 0) < v_cart_item.quantity then
      raise exception 'Stock changed while checking out' using errcode = 'P0001';
    end if;

    select base_price, shade_adjustment, final_price
    into v_base_price, v_shade_extra, v_unit_taxable
    from public.resolve_paint_configuration_price(v_variant.id, v_selected_shade_id);
    v_line_taxable := round(v_unit_taxable * v_cart_item.quantity, 2);
    v_line_tax := round(v_line_taxable * greatest(coalesce(v_product.gst_rate, 0), 0) / 100, 2);
    v_line_total := round(v_line_taxable + v_line_tax, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_taxable_amount := v_taxable_amount + v_line_taxable;
    v_tax_total := v_tax_total + v_line_tax;
    v_item_count := v_item_count + v_cart_item.quantity;

    v_line_items := v_line_items || jsonb_build_array(jsonb_build_object(
      'inventory_id', v_inventory.id,
      'product_id', v_product.id,
      'product_variant_id', v_variant.id,
      'shade_id', v_selected_shade_id,
      'shade_code_snapshot', coalesce(v_shade.shade_code, v_cart_item.shade_code_snapshot, v_variant.shade_code_snapshot),
      'shade_name_snapshot', coalesce(v_shade.shade_name, v_cart_item.shade_name_snapshot, v_variant.shade_name_snapshot),
      'colour_family_snapshot', coalesce(v_cart_item.colour_family_snapshot, v_shade.color_family),
      'hex_color_snapshot', coalesce(v_cart_item.hex_color_snapshot, v_shade.hex_color),
      'pack_size_snapshot', coalesce(v_variant.pack_size, v_cart_item.pack_size_snapshot),
      'finish_snapshot', coalesce(v_variant.finish, v_cart_item.finish_snapshot),
      'base_price_snapshot', v_base_price,
      'shade_extra_price_snapshot', v_shade_extra,
      'final_unit_price_snapshot', v_unit_taxable,
      'sku_snapshot', coalesce(v_variant.sku, v_cart_item.sku_snapshot),
      'product_name_snapshot', v_product.name,
      'quantity', v_cart_item.quantity,
      'unit_price', v_unit_taxable,
      'discount_amount', 0,
      'gst_rate', greatest(coalesce(v_product.gst_rate, 0), 0),
      'gst_amount', v_line_tax,
      'taxable_value', v_line_taxable,
      'total_amount', v_line_total
    ));
  end loop;

  if v_item_count = 0 then raise exception 'Cart is empty' using errcode = 'P0001'; end if;

  if v_coupon.id is not null then
    if v_coupon.minimum_order is not null and v_subtotal < v_coupon.minimum_order then
      raise exception 'Coupon minimum order not met' using errcode = 'P0001';
    end if;
    if v_coupon.coupon_type = 'percentage' then
      v_coupon_discount := round(least(v_subtotal * v_coupon.value / 100, case when coalesce(v_coupon.maximum_discount, 0) > 0 then v_coupon.maximum_discount else v_subtotal end), 2);
    else
      v_coupon_discount := round(least(v_coupon.value, v_subtotal), 2);
    end if;
  end if;

  v_shipping_total := public.resolve_checkout_shipping(v_taxable_amount);
  v_total_amount := greatest(round(v_subtotal + v_shipping_total - v_coupon_discount, 2), 0);

  return query select
    case when v_coupon.id is not null then v_coupon.id else null end,
    v_coupon_code_value,
    round(v_subtotal, 2),
    0::numeric(12,2),
    round(v_coupon_discount, 2),
    round(v_taxable_amount, 2),
    round(v_tax_total, 2),
    round(v_shipping_total, 2),
    round(v_total_amount, 2),
    v_item_count,
    v_line_items;
end;
$$;
