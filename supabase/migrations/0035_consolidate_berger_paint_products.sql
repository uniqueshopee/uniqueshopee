-- Consolidate the tested BERGER paint product into the production product.
-- Product A is retained for historical references and deactivated below.

do $$
declare
  v_source_product_id uuid := '0bba2b8d-2252-409d-b95c-5dd6642ea056';
  v_canonical_product_id uuid := '168ede60-56b2-4118-a1e2-1e4969aa0490';
  v_canonical_brand_id uuid := '436677eb-4b1a-421f-ac4c-eb28f452ce61';
  v_inserted integer;
begin
  if not exists (
    select 1
    from public.products
    where id = v_canonical_product_id
      and deleted_at is null
  ) then
    raise exception 'Canonical BERGER paint product is missing';
  end if;

  insert into public.product_shades (
    product_id,
    shade_id,
    finish,
    is_available,
    sort_order,
    deleted_at
  )
  select
    v_canonical_product_id,
    source.shade_id,
    source.finish,
    source.is_available,
    source.sort_order,
    null
  from public.product_shades source
  join public.shades shade on shade.id = source.shade_id
  where source.product_id = v_source_product_id
    and source.deleted_at is null
    and source.is_available = true
    and shade.brand_id = v_canonical_brand_id
    and shade.is_active = true
    and shade.deleted_at is null
    and not exists (
      select 1
      from public.product_shades existing
      where existing.product_id = v_canonical_product_id
        and existing.shade_id = source.shade_id
        and existing.deleted_at is null
        and coalesce(lower(existing.finish), '') = coalesce(lower(source.finish), '')
    );

  get diagnostics v_inserted = row_count;
  raise notice 'Migrated % valid BERGER compatibility mappings', v_inserted;

  update public.products
  set status = 'inactive',
      featured = false,
      updated_at = now()
  where id = v_source_product_id
    and deleted_at is null;
end $$;
