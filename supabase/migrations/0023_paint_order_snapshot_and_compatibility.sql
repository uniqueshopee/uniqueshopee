-- Capture paint metadata at order-item insert time and reject invalid paint
-- configurations before checkout can reserve inventory.
alter table public.cart_items
  add column if not exists colour_family_snapshot text;

alter table public.order_items
  add column if not exists colour_family_snapshot text,
  add column if not exists hex_color_snapshot text;

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
  if new.product_variant_id is null then return new; end if;

  select * into v_product from public.products where id = new.product_id and deleted_at is null;
  select * into v_variant from public.product_variants where id = new.product_variant_id and product_id = new.product_id and deleted_at is null and is_active = true and is_available = true;
  if not found then raise exception 'Selected variant is not available'; end if;

  if v_variant.shade_id is not null then
    select * into v_shade from public.shades where id = v_variant.shade_id and deleted_at is null and is_active = true;
    if not found then raise exception 'Selected shade is not available'; end if;
    if v_shade.brand_id is not null and v_product.brand_id <> v_shade.brand_id then raise exception 'Selected shade does not belong to this brand'; end if;
    if not exists (
      select 1 from public.product_shades ps
      where ps.product_id = new.product_id and ps.shade_id = v_variant.shade_id
        and ps.deleted_at is null and ps.is_available = true
        and (ps.finish is null or lower(ps.finish) = lower(coalesce(v_variant.finish, '')))
    ) then raise exception 'Selected shade is not available for this product and finish'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_paint_cart_item on public.cart_items;
create trigger trg_validate_paint_cart_item
before insert or update on public.cart_items
for each row execute function public.validate_paint_cart_item();

create or replace function public.snapshot_paint_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shade public.shades%rowtype;
  v_base public.paint_bases%rowtype;
begin
  if new.shade_id is not null then
    select * into v_shade from public.shades where id = new.shade_id;
    if new.colour_family_snapshot is null then new.colour_family_snapshot := v_shade.color_family; end if;
    if new.hex_color_snapshot is null then new.hex_color_snapshot := v_shade.hex_color; end if;
    if new.base_id is null then new.base_id := v_shade.base_id; end if;
  end if;
  if new.base_id is not null then
    select * into v_base from public.paint_bases where id = new.base_id;
    if new.base_name_snapshot is null then new.base_name_snapshot := v_base.name; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_snapshot_paint_order_item on public.order_items;
create trigger trg_snapshot_paint_order_item
before insert on public.order_items
for each row execute function public.snapshot_paint_order_item();

create index if not exists idx_order_items_paint_snapshot on public.order_items (shade_id, colour_family_snapshot) where shade_id is not null;
