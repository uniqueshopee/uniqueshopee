-- Preserve the product MRP-to-SP discount in the authoritative checkout
-- response. The resolved unit price is already the net SP plus any selected
-- shade surcharge, so this discount is informational and must not be
-- subtracted again from the payable amount.
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
  v_compare_price numeric(12,2);
  v_shade_extra numeric(12,2);
  v_unit_taxable numeric(12,2);
  v_line_taxable numeric(12,2);
  v_line_discount numeric(12,2);
  v_line_tax numeric(12,2);
  v_line_total numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_discount_total numeric(12,2) := 0;
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

    -- MRP-to-SP savings are based on the base selling price only. A shade
    -- surcharge changes the taxable/payable price but is not an MRP discount.
    v_compare_price := round(greatest(coalesce(v_variant.mrp_override, v_product.mrp, 0), 0), 2);
    v_line_discount := round(greatest(v_compare_price - v_base_price, 0) * v_cart_item.quantity, 2);
    v_discount_total := v_discount_total + v_line_discount;

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
      'discount_amount', v_line_discount,
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
    round(v_discount_total, 2),
    round(v_coupon_discount, 2),
    round(v_taxable_amount, 2),
    round(v_tax_total, 2),
    round(v_shipping_total, 2),
    round(v_total_amount, 2),
    v_item_count,
    v_line_items;
end;
$$;
