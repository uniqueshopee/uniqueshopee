-- Keep variant defaults deterministic for admin edits and API writes.
-- The existing 0020 unique index already rejects duplicate product/finish/
-- pack-size/unit combinations for active rows.
create or replace function public.ensure_single_default_product_variant()
returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    update public.product_variants
    set is_default = false,
        updated_at = now()
    where product_id = new.product_id
      and id <> new.id
      and is_default = true
      and deleted_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_single_default_product_variant on public.product_variants;
create trigger trg_single_default_product_variant
before insert or update of product_id, is_default on public.product_variants
for each row execute function public.ensure_single_default_product_variant();

create or replace function public.validate_paint_product_variant()
returns trigger
language plpgsql
as $$
declare
  v_is_paint boolean;
begin
  select d.slug = 'paints'
  into v_is_paint
  from public.products p
  join public.departments d on d.id = p.department_id
  where p.id = new.product_id;

  if coalesce(v_is_paint, false) then
    if nullif(trim(new.finish), '') is null then
      raise exception 'Paint variants require a finish';
    end if;
    if nullif(trim(new.pack_size), '') is null or trim(new.pack_size) !~ '^[0-9]+(\.[0-9]+)?$' or trim(new.pack_size)::numeric <= 0 then
      raise exception 'Paint variants require a positive numeric pack size';
    end if;
    if new.unit not in ('L', 'ml', 'kg', 'g') then
      raise exception 'Paint variants require a supported unit';
    end if;
    if coalesce(new.base_price, 0) < 0 then
      raise exception 'Paint variant base price cannot be negative';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_paint_product_variant on public.product_variants;
create trigger trg_validate_paint_product_variant
before insert or update on public.product_variants
for each row execute function public.validate_paint_product_variant();
