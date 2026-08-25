-- Reusable shades are linked to products through product_shades. Their
-- owning shade brand must not block a compatible product from being added
-- to the cart.
create or replace function public.validate_paint_cart_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_shade public.shades%rowtype;
begin
  if new.product_variant_id is null then
    return new;
  end if;

  select * into v_product
  from public.products
  where id = new.product_id and deleted_at is null;

  select * into v_variant
  from public.product_variants
  where id = new.product_variant_id
    and product_id = new.product_id
    and deleted_at is null
    and is_active = true
    and is_available = true;

  if not found then
    raise exception 'Selected variant is not available';
  end if;

  if v_variant.shade_id is not null then
    select * into v_shade
    from public.shades
    where id = v_variant.shade_id
      and deleted_at is null
      and is_active = true;

    if not found then
      raise exception 'Selected shade is not available';
    end if;

    if not exists (
      select 1
      from public.product_shades ps
      where ps.product_id = new.product_id
        and ps.shade_id = v_variant.shade_id
        and ps.deleted_at is null
        and ps.is_available = true
        and (ps.finish is null or lower(ps.finish) = lower(coalesce(v_variant.finish, '')))
    ) then
      raise exception 'Selected shade is not available for this product and finish';
    end if;
  end if;

  return new;
end;
$$;
