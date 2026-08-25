-- Forward-only pricing rules for paint configurations.
create table if not exists public.paint_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  product_variant_id uuid references public.product_variants(id) on delete cascade,
  shade_id uuid references public.shades(id) on delete cascade,
  finish text,
  pack_size text,
  adjustment_type text not null default 'fixed' check (adjustment_type in ('none', 'fixed', 'percentage')),
  adjustment_value numeric(12,2) not null default 0 check (adjustment_value >= 0),
  override_price numeric(12,2) check (override_price is null or override_price >= 0),
  priority integer not null default 0,
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_paint_pricing_rules_lookup
  on public.paint_pricing_rules (product_id, product_variant_id, shade_id, finish, pack_size, is_active)
  where deleted_at is null;

create unique index if not exists idx_shades_brand_code_active
  on public.shades (brand_id, lower(shade_code))
  where deleted_at is null and brand_id is not null;

alter table public.paint_pricing_rules enable row level security;
drop policy if exists paint_pricing_rules_public_select on public.paint_pricing_rules;
create policy paint_pricing_rules_public_select on public.paint_pricing_rules
for select using (deleted_at is null and is_active = true);
drop policy if exists paint_pricing_rules_admin_manage on public.paint_pricing_rules;
create policy paint_pricing_rules_admin_manage on public.paint_pricing_rules
for all using (public.is_admin_user()) with check (public.is_admin_user());

drop trigger if exists trg_set_updated_at on public.paint_pricing_rules;
create trigger trg_set_updated_at before update on public.paint_pricing_rules
for each row execute function public.set_updated_at();

-- Deterministic resolver used by server pricing callers. Specificity wins over
-- priority: variant+shade+finish+pack, shade+finish+pack, shade+pack,
-- shade, then variant/base fallback.
create or replace function public.resolve_paint_variant_price(p_variant_id uuid)
returns table (base_price numeric(12,2), shade_adjustment numeric(12,2), final_price numeric(12,2), rule_id uuid)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_variant public.product_variants%rowtype;
  v_rule public.paint_pricing_rules%rowtype;
  v_base numeric(12,2);
  v_adjustment numeric(12,2);
begin
  select * into v_variant from public.product_variants where id = p_variant_id and deleted_at is null and is_active = true and is_available = true;
  if not found then raise exception 'Variant is not available'; end if;

  select * into v_rule
  from public.paint_pricing_rules r
  where r.product_id = v_variant.product_id
    and r.deleted_at is null and r.is_active = true
    and (r.product_variant_id is null or r.product_variant_id = v_variant.id)
    and (r.shade_id is null or r.shade_id = v_variant.shade_id)
    and (r.finish is null or lower(r.finish) = lower(coalesce(v_variant.finish, '')))
    and (r.pack_size is null or r.pack_size = v_variant.pack_size)
  order by
    case when r.product_variant_id is not null then 16 else 0 end +
    case when r.shade_id is not null then 8 else 0 end +
    case when r.finish is not null then 4 else 0 end +
    case when r.pack_size is not null then 2 else 0 end desc,
    r.priority desc, r.updated_at desc
  limit 1;

  v_base := round(greatest(coalesce(v_variant.base_price, v_variant.selling_price_override, 0), 0), 2);
  if v_rule.id is null then
    v_adjustment := round(greatest(coalesce(v_variant.shade_extra_price, 0), 0), 2);
    if coalesce(v_variant.adjustment_type, 'fixed') = 'percentage' then v_adjustment := round(v_base * v_adjustment / 100, 2); end if;
    return query select v_base, v_adjustment, round(v_base + v_adjustment, 2), null::uuid;
  elsif v_rule.override_price is not null then
    return query select v_base, round(v_rule.adjustment_value, 2), round(v_rule.override_price, 2), v_rule.id;
  else
    v_adjustment := case when v_rule.adjustment_type = 'percentage' then round(v_base * v_rule.adjustment_value / 100, 2) else round(v_rule.adjustment_value, 2) end;
    if v_rule.adjustment_type = 'none' then v_adjustment := 0; end if;
    return query select v_base, v_adjustment, round(v_base + v_adjustment, 2), v_rule.id;
  end if;
end;
$$;
