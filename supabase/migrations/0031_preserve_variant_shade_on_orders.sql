-- Preserve the shade selected by the product variant even when the checkout
-- payload does not explicitly include shade_id.
create or replace function public.snapshot_paint_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_variant public.product_variants%rowtype;
  v_shade public.shades%rowtype;
begin
  if new.product_variant_id is not null then
    select * into v_variant
    from public.product_variants
    where id = new.product_variant_id
      and product_id = new.product_id
      and deleted_at is null;

    new.shade_id := coalesce(new.shade_id, v_variant.shade_id);
    new.shade_code_snapshot := coalesce(new.shade_code_snapshot, v_variant.shade_code_snapshot);
    new.shade_name_snapshot := coalesce(new.shade_name_snapshot, v_variant.shade_name_snapshot);
    new.colour_family_snapshot := coalesce(new.colour_family_snapshot, v_variant.color_family_snapshot);
    new.hex_color_snapshot := coalesce(new.hex_color_snapshot, v_variant.hex_color_snapshot);
  end if;

  if new.shade_id is not null then
    select * into v_shade from public.shades where id = new.shade_id;
    if found then
      new.shade_name_snapshot := coalesce(new.shade_name_snapshot, v_shade.shade_name);
      new.shade_code_snapshot := coalesce(new.shade_code_snapshot, v_shade.shade_code);
      new.colour_family_snapshot := coalesce(new.colour_family_snapshot, v_shade.color_family);
      new.hex_color_snapshot := coalesce(new.hex_color_snapshot, v_shade.hex_color);
      new.base_id := coalesce(new.base_id, v_shade.base_id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_snapshot_paint_order_item on public.order_items;
create trigger trg_snapshot_paint_order_item
before insert or update on public.order_items
for each row execute function public.snapshot_paint_order_item();

-- Repair existing order lines whose variant already identifies the shade.
update public.order_items oi
set shade_id = pv.shade_id
from public.product_variants pv
where oi.product_variant_id = pv.id
  and oi.shade_id is null
  and pv.shade_id is not null
  and oi.deleted_at is null;

update public.order_items oi
set
  shade_name_snapshot = coalesce(oi.shade_name_snapshot, s.shade_name),
  shade_code_snapshot = coalesce(oi.shade_code_snapshot, s.shade_code),
  colour_family_snapshot = coalesce(oi.colour_family_snapshot, s.color_family),
  hex_color_snapshot = coalesce(oi.hex_color_snapshot, s.hex_color)
from public.shades s
where oi.shade_id = s.id
  and oi.deleted_at is null;
