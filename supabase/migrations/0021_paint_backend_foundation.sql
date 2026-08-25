-- Forward-only extension of 0020_shade_system.sql.
-- Existing shade/product/order data is preserved; all new metadata is nullable
-- or defaulted so legacy rows remain valid.

create table if not exists public.paint_bases (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete set null,
  name text not null,
  code text,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(name)) > 0)
);

alter table public.shades
  add column if not exists tone text,
  add column if not exists depth text,
  add column if not exists base_id uuid references public.paint_bases(id) on delete set null,
  add column if not exists is_popular boolean not null default false,
  add column if not exists is_featured boolean not null default false,
  add column if not exists hue numeric(6,2),
  add column if not exists saturation numeric(6,2),
  add column if not exists lightness numeric(6,2);

alter table public.product_variants
  add column if not exists base_id uuid references public.paint_bases(id) on delete set null;

alter table public.cart_items
  add column if not exists base_id uuid references public.paint_bases(id) on delete set null,
  add column if not exists base_name_snapshot text;

alter table public.order_items
  add column if not exists base_id uuid references public.paint_bases(id) on delete set null,
  add column if not exists base_name_snapshot text;

alter table public.product_shades
  add column if not exists finish text;

-- 0020 created a product/shade uniqueness constraint. Replace it with a
-- finish-aware unique index while retaining legacy null-finish mappings.
alter table public.product_shades
  drop constraint if exists product_shades_product_id_shade_id_key;
create unique index if not exists idx_product_shades_unique_finish
  on public.product_shades (
    product_id,
    shade_id,
    coalesce(lower(finish), '')
  )
  where deleted_at is null;

alter table public.shades
  drop constraint if exists shades_tone_check,
  drop constraint if exists shades_depth_check;

alter table public.shades
  add constraint shades_tone_check check (tone is null or tone in ('warm', 'cool', 'neutral')),
  add constraint shades_depth_check check (depth is null or depth in ('light', 'medium', 'dark'));

create index if not exists idx_shades_brand_active_family
  on public.shades (brand_id, is_active, color_family)
  where deleted_at is null;
create index if not exists idx_shades_family_depth
  on public.shades (color_family, depth)
  where deleted_at is null;
create index if not exists idx_shades_name_code_search
  on public.shades (lower(shade_name), lower(shade_code))
  where deleted_at is null and is_active = true;
create index if not exists idx_shades_base_id on public.shades (base_id);
create index if not exists idx_product_shades_product_finish
  on public.product_shades (product_id, finish, is_available)
  where deleted_at is null;
create index if not exists idx_product_variants_product_config
  on public.product_variants (product_id, finish, pack_size, unit, shade_id)
  where deleted_at is null and is_active = true and is_available = true;

create unique index if not exists idx_paint_bases_brand_code_active
  on public.paint_bases (brand_id, lower(code))
  where deleted_at is null and code is not null;
create index if not exists idx_paint_bases_active_sort
  on public.paint_bases (is_active, sort_order)
  where deleted_at is null;

drop trigger if exists trg_set_updated_at on public.paint_bases;
create trigger trg_set_updated_at before update on public.paint_bases
for each row execute function public.set_updated_at();

alter table public.paint_bases enable row level security;
drop policy if exists paint_bases_public_select on public.paint_bases;
create policy paint_bases_public_select on public.paint_bases
for select using (deleted_at is null and is_active = true);
drop policy if exists paint_bases_admin_manage on public.paint_bases;
create policy paint_bases_admin_manage on public.paint_bases
for all using (public.is_admin_user()) with check (public.is_admin_user());

-- A non-null finish mapping is authoritative for that finish. A legacy null
-- mapping remains a product-wide compatibility mapping for old data.
create or replace function public.is_product_shade_available(
  p_product_id uuid,
  p_shade_id uuid,
  p_finish text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.product_shades ps
    join public.shades s on s.id = ps.shade_id
    where ps.product_id = p_product_id
      and ps.shade_id = p_shade_id
      and ps.deleted_at is null
      and ps.is_available = true
      and s.deleted_at is null
      and s.is_active = true
      and (ps.finish is null or lower(ps.finish) = lower(nullif(trim(p_finish), '')))
  );
$$;

grant execute on function public.is_product_shade_available(uuid, uuid, text) to authenticated;
