alter table public.paint_pricing_rules
  add column if not exists colour_family text,
  add column if not exists tone text,
  add column if not exists depth text;

create index if not exists idx_paint_pricing_rules_groups
  on public.paint_pricing_rules (product_id, colour_family, tone, depth, finish, pack_size)
  where deleted_at is null and is_active = true;

-- Group rules are less specific than a shade rule and therefore resolve after
-- shade-specific rules but before the variant fallback.
create or replace function public.resolve_paint_variant_price(p_variant_id uuid)
returns table (base_price numeric(12,2), shade_adjustment numeric(12,2), final_price numeric(12,2), rule_id uuid)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_variant public.product_variants%rowtype;
  v_shade public.shades%rowtype;
  v_rule public.paint_pricing_rules%rowtype;
  v_base numeric(12,2);
  v_adjustment numeric(12,2);
begin
  select * into v_variant from public.product_variants where id = p_variant_id and deleted_at is null and is_active = true and is_available = true;
  if not found then raise exception 'Variant is not available'; end if;
  if v_variant.shade_id is not null then select * into v_shade from public.shades where id = v_variant.shade_id; end if;
  select * into v_rule from public.paint_pricing_rules r
  where r.product_id = v_variant.product_id and r.deleted_at is null and r.is_active = true
    and (r.product_variant_id is null or r.product_variant_id = v_variant.id)
    and (r.shade_id is null or r.shade_id = v_variant.shade_id)
    and (r.colour_family is null or lower(r.colour_family) = lower(coalesce(v_shade.color_family, '')))
    and (r.tone is null or lower(r.tone) = lower(coalesce(v_shade.tone, '')))
    and (r.depth is null or lower(r.depth) = lower(coalesce(v_shade.depth, '')))
    and (r.finish is null or lower(r.finish) = lower(coalesce(v_variant.finish, '')))
    and (r.pack_size is null or r.pack_size = v_variant.pack_size)
  order by (case when r.product_variant_id is not null then 32 else 0 end + case when r.shade_id is not null then 16 else 0 end + case when r.colour_family is not null then 8 else 0 end + case when r.tone is not null or r.depth is not null then 4 else 0 end + case when r.finish is not null then 2 else 0 end + case when r.pack_size is not null then 1 else 0 end) desc, r.priority desc, r.updated_at desc limit 1;
  v_base := round(greatest(coalesce(v_variant.base_price, v_variant.selling_price_override, 0), 0), 2);
  if v_rule.id is null then
    v_adjustment := round(greatest(coalesce(v_variant.shade_extra_price, 0), 0), 2);
    if coalesce(v_variant.adjustment_type, 'fixed') = 'percentage' then v_adjustment := round(v_base * v_adjustment / 100, 2); end if;
    return query select v_base, v_adjustment, round(v_base + v_adjustment, 2), null::uuid;
  elsif v_rule.override_price is not null then return query select v_base, round(v_rule.adjustment_value, 2), round(v_rule.override_price, 2), v_rule.id;
  else
    v_adjustment := case when v_rule.adjustment_type = 'percentage' then round(v_base * v_rule.adjustment_value / 100, 2) else round(v_rule.adjustment_value, 2) end;
    if v_rule.adjustment_type = 'none' then v_adjustment := 0; end if;
    return query select v_base, v_adjustment, round(v_base + v_adjustment, 2), v_rule.id;
  end if;
end;
$$;
