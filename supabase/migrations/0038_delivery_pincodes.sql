create table if not exists public.delivery_pincodes (
  id uuid primary key default gen_random_uuid(),
  pincode text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_pincodes_pincode_format check (pincode ~ '^[0-9]{6}$'),
  constraint delivery_pincodes_pincode_unique unique (pincode)
);

create index if not exists delivery_pincodes_active_pincode_idx
  on public.delivery_pincodes (pincode)
  where is_active = true;

drop trigger if exists trg_set_updated_at on public.delivery_pincodes;
create trigger trg_set_updated_at
before update on public.delivery_pincodes
for each row execute function public.set_updated_at();

alter table public.delivery_pincodes enable row level security;

drop policy if exists delivery_pincodes_admin_manage on public.delivery_pincodes;
create policy delivery_pincodes_admin_manage
on public.delivery_pincodes
for all
using (public.is_admin_user())
with check (public.is_admin_user());

create or replace function public.check_delivery_pincode(p_pincode text)
returns table (normalized_pincode text, is_valid boolean, is_serviceable boolean)
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_pincode text := trim(coalesce(p_pincode, ''));
begin
  if v_pincode !~ '^[0-9]{6}$' then
    return query select v_pincode, false, false;
    return;
  end if;

  return query
  select v_pincode,
    true,
    exists (
      select 1 from public.delivery_pincodes dp
      where dp.pincode = v_pincode and dp.is_active = true
    );
end;
$$;

revoke all on function public.check_delivery_pincode(text) from public;
grant execute on function public.check_delivery_pincode(text) to anon, authenticated;

create or replace function public.validate_delivery_pincode_for_address()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  new.pin_code := trim(coalesce(new.pin_code, ''));
  if new.pin_code !~ '^[0-9]{6}$'
    or not exists (
      select 1 from public.delivery_pincodes dp
      where dp.pincode = new.pin_code and dp.is_active = true
    ) then
    raise exception 'Pincode is not available for delivery' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_delivery_pincode on public.addresses;
create trigger trg_validate_delivery_pincode
before insert or update of pin_code on public.addresses
for each row execute function public.validate_delivery_pincode_for_address();

create or replace function public.validate_delivery_pincode_for_order()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_pincode text := trim(coalesce(
    new.shipping_address_snapshot ->> 'pin_code',
    new.shipping_address_snapshot ->> 'pincode',
    new.shipping_address_snapshot ->> 'pin',
    ''
  ));
begin
  if v_pincode !~ '^[0-9]{6}$'
    or not exists (
      select 1 from public.delivery_pincodes dp
      where dp.pincode = v_pincode and dp.is_active = true
    ) then
    raise exception 'Delivery is not available at this pincode' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_delivery_pincode_for_order on public.orders;
create trigger trg_validate_delivery_pincode_for_order
before insert on public.orders
for each row execute function public.validate_delivery_pincode_for_order();
