create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_inventory_stock_status()
returns trigger
language plpgsql
as $$
declare
  available_quantity integer;
begin
  available_quantity := greatest(coalesce(new.current_quantity, 0) - coalesce(new.reserved_quantity, 0), 0);

  new.stock_status :=
    case
      when available_quantity <= 0 then 'out_of_stock'
      when available_quantity <= coalesce(new.low_stock_threshold, 0) then 'low_stock'
      else 'in_stock'
    end;

  return new;
end;
$$;

create or replace function public.sync_order_timestamps()
returns trigger
language plpgsql
as $$
begin
  if old.status is distinct from new.status then
    case new.status
      when 'confirmed' then new.confirmed_at := coalesce(new.confirmed_at, now());
      when 'packed' then new.packed_at := coalesce(new.packed_at, now());
      when 'shipped' then new.shipped_at := coalesce(new.shipped_at, now());
      when 'delivered' then new.delivered_at := coalesce(new.delivered_at, now());
      when 'cancelled' then new.cancelled_at := coalesce(new.cancelled_at, now());
      when 'returned' then new.returned_at := coalesce(new.returned_at, now());
      when 'refunded' then new.refunded_at := coalesce(new.refunded_at, now());
      else null;
    end case;
  end if;

  return new;
end;
$$;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  level integer not null default 0,
  is_system boolean not null default false,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role_id uuid references public.roles(id) on delete set null,
  full_name text,
  email citext not null,
  phone text,
  avatar_url text,
  customer_code text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended', 'deleted')),
  email_verified_at timestamptz,
  last_login_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, role_id)
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon_url text,
  hero_image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete restrict,
  slug text not null unique,
  name text not null,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  name text not null,
  description text,
  logo_url text,
  website_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  brand_id uuid not null references public.brands(id) on delete restrict,
  slug text not null unique,
  sku text not null unique,
  name text not null,
  description text,
  short_description text,
  gst_rate numeric(5,2) not null default 18.00,
  mrp numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  discount_percent numeric(5,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive', 'out_of_stock', 'archived')),
  featured boolean not null default false,
  meta_title text,
  meta_description text,
  meta_keywords text[],
  canonical_url text,
  og_image_url text,
  specification jsonb not null default '{}'::jsonb,
  attributes jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (mrp >= 0),
  check (selling_price >= 0),
  check (discount_amount >= 0),
  check (discount_percent >= 0)
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  variant_name text not null,
  option_label text,
  option_value text,
  variant_options jsonb not null default '{}'::jsonb,
  mrp_override numeric(12,2),
  selling_price_override numeric(12,2),
  barcode text,
  weight numeric(10,3),
  is_default boolean not null default false,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (mrp_override is null or mrp_override >= 0),
  check (selling_price_override is null or selling_price_override >= 0),
  check (weight is null or weight >= 0)
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_variant_id uuid not null references public.product_variants(id) on delete cascade,
  current_quantity integer not null default 0,
  reserved_quantity integer not null default 0,
  low_stock_threshold integer not null default 10,
  stock_status text not null default 'in_stock' check (stock_status in ('in_stock', 'low_stock', 'out_of_stock')),
  warehouse_location text,
  last_counted_at timestamptz,
  last_restocked_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_quantity >= 0),
  check (reserved_quantity >= 0),
  check (low_stock_threshold >= 0)
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  full_name text not null,
  phone text not null,
  alternate_phone text,
  line1 text not null,
  line2 text,
  landmark text,
  area text,
  city text not null,
  state text not null,
  country text not null default 'India',
  pin_code text not null,
  address_type text not null default 'home' check (address_type in ('home', 'office', 'other')),
  latitude numeric(10,7),
  longitude numeric(10,7),
  is_default boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  quantity integer not null default 1,
  unit_price numeric(12,2),
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (quantity > 0),
  check (unit_price is null or unit_price >= 0)
);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  coupon_type text not null check (coupon_type in ('percentage', 'flat')),
  value numeric(12,2) not null,
  minimum_order numeric(12,2) not null default 0,
  maximum_discount numeric(12,2) not null default 0,
  usage_limit integer,
  per_user_limit integer not null default 1,
  start_at timestamptz,
  expiry_at timestamptz,
  status text not null default 'active' check (status in ('active', 'inactive', 'expired')),
  applies_to jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (value >= 0),
  check (minimum_order >= 0),
  check (maximum_discount >= 0),
  check (per_user_limit >= 0)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_number text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  payment_method text,
  payment_reference text,
  coupon_id uuid references public.coupons(id) on delete set null,
  shipping_address_id uuid references public.addresses(id) on delete set null,
  billing_address_id uuid references public.addresses(id) on delete set null,
  shipping_address_snapshot jsonb not null default '{}'::jsonb,
  billing_address_snapshot jsonb not null default '{}'::jsonb,
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  shipping_total numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  currency char(3) not null default 'INR',
  notes text,
  tracking_number text,
  placed_at timestamptz not null default now(),
  confirmed_at timestamptz,
  packed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  returned_at timestamptz,
  refunded_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (subtotal >= 0),
  check (discount_total >= 0),
  check (shipping_total >= 0),
  check (tax_total >= 0),
  check (total_amount >= 0)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  sku_snapshot text,
  product_name_snapshot text not null,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  gst_rate numeric(5,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (quantity > 0),
  check (unit_price >= 0),
  check (discount_amount >= 0),
  check (gst_rate >= 0),
  check (total_amount >= 0)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  title text,
  comment text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'hidden')),
  is_verified_purchase boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  discount_amount numeric(12,2) not null default 0,
  used_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_amount >= 0)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  action_label text,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  placement text not null default 'home_hero',
  image_url text not null,
  mobile_image_url text,
  link_url text,
  department_id uuid references public.departments(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ticket_number text not null unique,
  subject text not null,
  category text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  description text not null,
  order_id uuid references public.orders(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  assigned_to_profile_id uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  closed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_ticket_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  attachments jsonb not null default '[]'::jsonb,
  is_internal boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.paint_calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  room_name text,
  unit text not null check (unit in ('feet', 'meters')),
  length numeric(12,2) not null default 0,
  width numeric(12,2) not null default 0,
  height numeric(12,2) not null default 0,
  doors_count integer not null default 0,
  windows_count integer not null default 0,
  paint_type text not null,
  surface_type text not null,
  coats integer not null default 2,
  total_area numeric(12,2) not null default 0,
  opening_area numeric(12,2) not null default 0,
  paintable_area numeric(12,2) not null default 0,
  estimated_litres numeric(12,2) not null default 0,
  recommended_purchase jsonb not null default '[]'::jsonb,
  calculation_meta jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length >= 0),
  check (width >= 0),
  check (height >= 0),
  check (doors_count >= 0),
  check (windows_count >= 0),
  check (coats between 1 and 5),
  check (total_area >= 0),
  check (opening_area >= 0),
  check (paintable_area >= 0),
  check (estimated_litres >= 0)
);

create table if not exists public.room_visualizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  source_image_url text not null,
  preview_image_url text,
  category text,
  brand_id uuid references public.brands(id) on delete set null,
  color_name text,
  color_hex text,
  opacity numeric(4,2) not null default 0.65,
  before_after_ratio numeric(4,2) not null default 0.5,
  is_favorite boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (opacity between 0 and 1),
  check (before_after_ratio between 0 and 1)
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'global',
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  description text,
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, key)
);

insert into public.roles (key, name, description, level, is_system)
values
  ('customer', 'Customer', 'Marketplace shopper', 10, true),
  ('admin', 'Admin', 'Full platform administrator', 100, true),
  ('manager', 'Manager', 'Operational manager', 80, true),
  ('staff', 'Staff', 'Operational staff member', 60, true)
on conflict (key) do nothing;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'roles',
    'profiles',
    'profile_roles',
    'departments',
    'categories',
    'brands',
    'products',
    'product_images',
    'product_variants',
    'inventory',
    'addresses',
    'cart_items',
    'wishlist_items',
    'coupons',
    'orders',
    'order_items',
    'reviews',
    'coupon_usage',
    'notifications',
    'banners',
    'support_tickets',
    'support_ticket_replies',
    'paint_calculations',
    'room_visualizations',
    'settings'
  ]
  loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I;', table_name);
    execute format('create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at();', table_name);
  end loop;
end;
$$;

drop trigger if exists trg_sync_inventory_stock_status on public.inventory;
create trigger trg_sync_inventory_stock_status
before insert or update on public.inventory
for each row
execute function public.sync_inventory_stock_status();

drop trigger if exists trg_sync_order_timestamps on public.orders;
create trigger trg_sync_order_timestamps
before update on public.orders
for each row
execute function public.sync_order_timestamps();
