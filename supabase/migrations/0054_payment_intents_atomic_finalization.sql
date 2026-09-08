-- Provider-neutral payment intent storage and atomic paid-order finalization.
-- COD references are intentionally excluded from payment-reference uniqueness.

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  provider_order_id text not null,
  provider_payment_id text,
  checkout_group_id uuid not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'INR',
  payment_method text not null,
  status text not null default 'created' check (status in ('created', 'pending', 'paid', 'failed', 'finalized')),
  idempotency_key uuid not null,
  cart_snapshot jsonb not null default '{}'::jsonb,
  pricing_snapshot jsonb not null default '{}'::jsonb,
  shipping_address_id uuid references public.addresses(id) on delete set null,
  billing_address_id uuid references public.addresses(id) on delete set null,
  shipping_address_snapshot jsonb not null default '{}'::jsonb,
  billing_address_snapshot jsonb not null default '{}'::jsonb,
  coupon_code text,
  notes text,
  finalized_order_id uuid references public.orders(id) on delete set null,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  finalized_at timestamptz
);

create unique index if not exists payment_intents_provider_order_idx
  on public.payment_intents (provider, provider_order_id);

create unique index if not exists payment_intents_provider_payment_idx
  on public.payment_intents (provider, provider_payment_id)
  where provider_payment_id is not null and provider_payment_id <> '';

create unique index if not exists payment_intents_provider_idempotency_idx
  on public.payment_intents (provider, idempotency_key);

create index if not exists payment_intents_user_id_idx on public.payment_intents (user_id);
create index if not exists payment_intents_status_idx on public.payment_intents (status);
create index if not exists payment_intents_checkout_group_idx
  on public.payment_intents (user_id, checkout_group_id, id);

create unique index if not exists orders_payment_reference_non_cod_idx
  on public.orders (payment_reference)
  where payment_reference is not null
    and trim(payment_reference) <> ''
    and payment_reference <> 'COD';

alter table public.payment_intents enable row level security;

drop policy if exists payment_intents_owner_select on public.payment_intents;
create policy payment_intents_owner_select
on public.payment_intents
for select
using (auth.uid() = user_id);

drop trigger if exists trg_set_updated_at on public.payment_intents;
create trigger trg_set_updated_at
before update on public.payment_intents
for each row execute function public.set_updated_at();

grant select on public.payment_intents to authenticated;
grant select, insert, update on public.payment_intents to service_role;

create or replace function public.create_payment_intent(
  p_provider text,
  p_provider_order_id text,
  p_amount numeric,
  p_currency text,
  p_payment_method text,
  p_idempotency_key uuid,
  p_checkout_group_id uuid,
  p_cart_snapshot jsonb default '{}'::jsonb,
  p_pricing_snapshot jsonb default '{}'::jsonb,
  p_shipping_address_id uuid default null,
  p_billing_address_id uuid default null,
  p_shipping_address_snapshot jsonb default '{}'::jsonb,
  p_billing_address_snapshot jsonb default '{}'::jsonb,
  p_coupon_code text default null,
  p_notes text default null,
  p_actor_user_id uuid default null
)
returns table (payment_intent_id uuid, provider_order_id text, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text := coalesce(auth.jwt() ->> 'role', '');
  v_owner_user_id uuid;
  v_existing public.payment_intents%rowtype;
  v_id uuid;
begin
  if v_user_id is null and v_role <> 'service_role' then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if v_user_id is null and p_actor_user_id is null then
    raise exception 'Payment intent owner is required' using errcode = '28000';
  end if;
  v_owner_user_id := coalesce(v_user_id, p_actor_user_id);

  insert into public.payment_intents (
    user_id, provider, provider_order_id, amount, currency, payment_method,
    idempotency_key, checkout_group_id, cart_snapshot, pricing_snapshot, shipping_address_id,
    billing_address_id, shipping_address_snapshot, billing_address_snapshot,
    coupon_code, notes
  ) values (
    v_owner_user_id, nullif(trim(p_provider), ''), nullif(trim(p_provider_order_id), ''),
    round(p_amount, 2), upper(trim(p_currency)), nullif(trim(p_payment_method), ''),
    p_idempotency_key, p_checkout_group_id, coalesce(p_cart_snapshot, '{}'::jsonb), coalesce(p_pricing_snapshot, '{}'::jsonb),
    p_shipping_address_id, p_billing_address_id, coalesce(p_shipping_address_snapshot, '{}'::jsonb),
    coalesce(p_billing_address_snapshot, '{}'::jsonb), nullif(trim(coalesce(p_coupon_code, '')), ''),
    nullif(trim(coalesce(p_notes, '')), '')
  ) on conflict (provider, idempotency_key) do nothing returning id into v_id;

  if v_id is null then
    select * into v_existing
    from public.payment_intents
    where provider = nullif(trim(p_provider), '')
      and idempotency_key = p_idempotency_key
    for update;
    if not found then raise exception 'Unable to resolve payment intent idempotency conflict' using errcode = 'P0001'; end if;
    if v_existing.user_id <> v_owner_user_id then raise exception 'Payment intent access denied' using errcode = '42501'; end if;
    return query select v_existing.id, v_existing.provider_order_id, v_existing.status;
    return;
  end if;

  return query select v_id, nullif(trim(p_provider_order_id), ''), 'created'::text;
end;
$$;

create or replace function public.update_payment_intent_status(
  p_payment_intent_id uuid,
  p_provider_order_id text,
  p_provider_payment_id text default null,
  p_status text default 'pending',
  p_failure_message text default null,
  p_actor_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent public.payment_intents%rowtype;
  v_user_id uuid := auth.uid();
  v_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if v_user_id is null and v_role <> 'service_role' then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into v_intent from public.payment_intents where id = p_payment_intent_id for update;
  if not found then raise exception 'Payment intent not found' using errcode = 'P0001'; end if;
  if v_user_id is not null and v_intent.user_id <> v_user_id then raise exception 'Payment intent access denied' using errcode = '42501'; end if;
  if v_user_id is null and p_actor_user_id is distinct from v_intent.user_id then raise exception 'Payment intent access denied' using errcode = '42501'; end if;
  if v_intent.provider_order_id <> p_provider_order_id or v_intent.provider <> 'Cashfree' then raise exception 'Payment intent provider mismatch' using errcode = 'P0001'; end if;
  if p_status = 'paid' and p_provider_payment_id is not null and v_intent.provider_payment_id is not null and v_intent.provider_payment_id <> p_provider_payment_id then raise exception 'Payment intent payment mismatch' using errcode = 'P0001'; end if;

  if v_intent.status = 'finalized' then return; end if;
  update public.payment_intents
  set provider_payment_id = case when p_status = 'paid' then coalesce(nullif(trim(p_provider_payment_id), ''), provider_payment_id) else provider_payment_id end,
      status = case when p_status in ('created', 'pending', 'paid', 'failed') then p_status else status end,
      failure_message = nullif(trim(coalesce(p_failure_message, '')), ''),
      completed_at = case when p_status in ('paid', 'failed') then coalesce(completed_at, now()) else completed_at end
  where id = v_intent.id;
end;
$$;

create or replace function public.finalize_payment_intent(
  p_payment_intent_id uuid,
  p_provider_order_id text,
  p_provider_payment_id text,
  p_provider_amount numeric,
  p_provider_currency text,
  p_payment_method text,
  p_actor_user_id uuid default null
)
returns table (order_id uuid, order_number text, already_finalized boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent public.payment_intents%rowtype;
  v_existing public.orders%rowtype;
  v_user_id uuid := auth.uid();
  v_role text := coalesce(auth.jwt() ->> 'role', '');
  v_pricing jsonb;
  v_cart jsonb;
  v_line_item jsonb;
  v_cart_row jsonb;
  v_order_id uuid := gen_random_uuid();
  v_order_number text := public.generate_order_number();
  v_inventory public.inventory%rowtype;
  v_coupon_id uuid;
  v_coupon public.coupons%rowtype;
  v_coupon_usage_count integer;
  v_user_coupon_usage_count integer;
  v_coupon_discount numeric(12,2) := 0;
  v_cart_item_ids uuid[] := '{}'::uuid[];
  v_cart_item_id uuid;
  v_quantity integer;
  v_inventory_id uuid;
  v_snapshot_quantity integer;
  v_group_intent public.payment_intents%rowtype;
  v_requested_intent_found boolean := false;
  v_inventory_ids uuid[] := '{}'::uuid[];
  v_required_quantity integer;
  v_locked_inventory_count integer := 0;
begin
  if v_user_id is null and v_role <> 'service_role' then raise exception 'Authentication required' using errcode = '28000'; end if;

  select * into v_intent from public.payment_intents where id = p_payment_intent_id;
  if not found then raise exception 'Payment intent not found' using errcode = 'P0001'; end if;
  if v_user_id is not null and v_intent.user_id <> v_user_id then raise exception 'Payment intent access denied' using errcode = '42501'; end if;
  if v_user_id is null and p_actor_user_id is distinct from v_intent.user_id then raise exception 'Payment intent access denied' using errcode = '42501'; end if;

  for v_group_intent in
    select *
    from public.payment_intents
    where user_id = v_intent.user_id
      and checkout_group_id = v_intent.checkout_group_id
    order by id
    for update
  loop
    if v_group_intent.id = p_payment_intent_id then
      v_intent := v_group_intent;
      v_requested_intent_found := true;
    end if;
    if v_group_intent.finalized_order_id is not null then
      update public.payment_intents
      set status = 'finalized', finalized_order_id = v_group_intent.finalized_order_id,
          finalized_at = coalesce(finalized_at, now()), completed_at = coalesce(completed_at, now())
      where id = v_intent.id and finalized_order_id is null;
      return query
      select o.id, o.order_number, true
      from public.orders o
      where o.id = v_group_intent.finalized_order_id;
      return;
    end if;
  end loop;

  if not v_requested_intent_found then raise exception 'Payment intent not found in checkout group' using errcode = 'P0001'; end if;
  if v_intent.provider <> 'Cashfree' or v_intent.provider_order_id <> p_provider_order_id then raise exception 'Payment intent provider mismatch' using errcode = 'P0001'; end if;
  if nullif(trim(p_provider_payment_id), '') is null then raise exception 'Payment reference is required' using errcode = 'P0001'; end if;
  if upper(trim(p_provider_currency)) <> upper(v_intent.currency) then raise exception 'Payment currency mismatch' using errcode = 'P0001'; end if;
  if round(p_provider_amount, 2) <> round(v_intent.amount, 2) then raise exception 'Payment amount mismatch' using errcode = 'P0001'; end if;
  if v_intent.payment_method <> p_payment_method then raise exception 'Payment method mismatch' using errcode = 'P0001'; end if;

  select * into v_existing
  from public.orders
  where user_id = v_intent.user_id and payment_reference = p_provider_payment_id
  limit 1
  for update;
  if found then
    update public.payment_intents
    set provider_payment_id = p_provider_payment_id, status = 'finalized', finalized_order_id = v_existing.id,
        finalized_at = coalesce(finalized_at, now()), completed_at = coalesce(completed_at, now())
    where id = v_intent.id;
    return query select v_existing.id, v_existing.order_number, true;
    return;
  end if;

  v_pricing := v_intent.pricing_snapshot;
  v_cart := v_intent.cart_snapshot;
  v_coupon_id := nullif(v_pricing ->> 'coupon_id', '')::uuid;
  v_coupon_discount := coalesce(nullif(v_pricing ->> 'coupon_discount', '')::numeric, 0);

  if v_coupon_id is not null then
    select * into v_coupon
    from public.coupons
    where id = v_coupon_id and deleted_at is null
    for update;
    if not found then raise exception 'Coupon is no longer available' using errcode = 'P0001'; end if;

    select count(*) into v_coupon_usage_count
    from public.coupon_usage
    where coupon_id = v_coupon.id and deleted_at is null;
    if v_coupon.usage_limit is not null and v_coupon.usage_limit > 0 and v_coupon_usage_count >= v_coupon.usage_limit then
      raise exception 'Coupon usage limit reached' using errcode = 'P0001';
    end if;

    select count(*) into v_user_coupon_usage_count
    from public.coupon_usage
    where coupon_id = v_coupon.id and user_id = v_intent.user_id and deleted_at is null;
    if v_coupon.per_user_limit is not null and v_coupon.per_user_limit > 0 and v_user_coupon_usage_count >= v_coupon.per_user_limit then
      raise exception 'Coupon already used' using errcode = 'P0001';
    end if;
  end if;

  if jsonb_typeof(v_cart -> 'line_items') <> 'array' or jsonb_array_length(v_cart -> 'line_items') = 0 then
    raise exception 'Payment intent cart snapshot is empty' using errcode = 'P0001';
  end if;

  for v_line_item in select value from jsonb_array_elements(v_cart -> 'line_items') as value loop
    v_inventory_id := nullif(trim(v_line_item ->> 'inventory_id'), '')::uuid;
    v_quantity := (v_line_item ->> 'quantity')::integer;
    if v_inventory_id is null or v_quantity is null or v_quantity <= 0 then raise exception 'Invalid payment intent cart snapshot' using errcode = 'P0001'; end if;
  end loop;

  select coalesce(array_agg(inventory_id order by inventory_id), '{}'::uuid[])
  into v_inventory_ids
  from (
    select distinct nullif(trim(value ->> 'inventory_id'), '')::uuid as inventory_id
    from jsonb_array_elements(v_cart -> 'line_items') as line(value)
  ) inventory_ids;

  for v_inventory in
    select *
    from public.inventory
    where id = any(v_inventory_ids) and deleted_at is null
    order by id
    for update
  loop
    v_locked_inventory_count := v_locked_inventory_count + 1;
    select coalesce(sum((value ->> 'quantity')::integer), 0)::integer
    into v_required_quantity
    from jsonb_array_elements(v_cart -> 'line_items') as line(value)
    where nullif(trim(value ->> 'inventory_id'), '')::uuid = v_inventory.id;
    if v_required_quantity is null or v_required_quantity <= 0 then raise exception 'Invalid payment intent cart snapshot' using errcode = 'P0001'; end if;
    if greatest(coalesce(v_inventory.current_quantity, 0) - coalesce(v_inventory.reserved_quantity, 0), 0) < v_required_quantity then raise exception 'Stock changed while finalizing payment' using errcode = 'P0001'; end if;
  end loop;
  if v_locked_inventory_count <> cardinality(v_inventory_ids) then raise exception 'Inventory record missing' using errcode = 'P0001'; end if;

  insert into public.orders (
    id, user_id, order_number, status, payment_status, payment_method, payment_reference,
    coupon_id, shipping_address_id, billing_address_id, shipping_address_snapshot,
    billing_address_snapshot, subtotal, discount_total, shipping_total, tax_total,
    total_amount, notes, placed_at
  ) values (
    v_order_id, v_intent.user_id, v_order_number, 'pending', 'paid', v_intent.payment_method, p_provider_payment_id,
    v_coupon_id, v_intent.shipping_address_id, v_intent.billing_address_id,
    v_intent.shipping_address_snapshot, v_intent.billing_address_snapshot,
    coalesce(nullif(v_pricing ->> 'subtotal', '')::numeric, 0),
    coalesce(nullif(v_pricing ->> 'discount_total', '')::numeric, 0) + v_coupon_discount,
    coalesce(nullif(v_pricing ->> 'shipping_total', '')::numeric, 0),
    coalesce(nullif(v_pricing ->> 'tax_total', '')::numeric, 0),
    v_intent.amount, v_intent.notes, now()
  );

  for v_line_item in select value from jsonb_array_elements(v_cart -> 'line_items') as value loop
    v_cart_item_id := nullif(v_line_item ->> 'cart_item_id', '')::uuid;
    v_quantity := (v_line_item ->> 'quantity')::integer;
    v_cart_row := (select value from jsonb_array_elements(coalesce(v_cart -> 'cart_rows', '[]'::jsonb)) as value where (value ->> 'id')::uuid = v_cart_item_id limit 1);
    insert into public.order_items (
      id, order_id, product_id, product_variant_id, shade_id, shade_code_snapshot,
      shade_name_snapshot, colour_family_snapshot, hex_color_snapshot, base_id,
      base_name_snapshot, pack_size_snapshot, finish_snapshot, base_price_snapshot,
      shade_extra_price_snapshot, final_unit_price_snapshot, sku_snapshot,
      product_name_snapshot, quantity, unit_price, discount_amount, gst_rate, total_amount
    ) values (
      gen_random_uuid(), v_order_id, (v_line_item ->> 'product_id')::uuid,
      (v_line_item ->> 'product_variant_id')::uuid, nullif(v_line_item ->> 'shade_id', '')::uuid,
      v_line_item ->> 'shade_code_snapshot', v_line_item ->> 'shade_name_snapshot',
      v_line_item ->> 'colour_family_snapshot', v_line_item ->> 'hex_color_snapshot',
      coalesce(nullif(v_cart_row ->> 'base_id', '')::uuid, nullif(v_line_item ->> 'base_id', '')::uuid),
      coalesce(v_cart_row ->> 'base_name_snapshot', v_line_item ->> 'base_name_snapshot'),
      v_line_item ->> 'pack_size_snapshot', v_line_item ->> 'finish_snapshot',
      nullif(v_line_item ->> 'base_price_snapshot', '')::numeric,
      nullif(v_line_item ->> 'shade_extra_price_snapshot', '')::numeric,
      nullif(v_line_item ->> 'final_unit_price_snapshot', '')::numeric,
      v_line_item ->> 'sku_snapshot', v_line_item ->> 'product_name_snapshot',
      v_quantity, (v_line_item ->> 'unit_price')::numeric,
      (v_line_item ->> 'discount_amount')::numeric, (v_line_item ->> 'gst_rate')::numeric,
      (v_line_item ->> 'total_amount')::numeric
    );
    v_cart_item_ids := array_append(v_cart_item_ids, v_cart_item_id);
  end loop;

  for v_inventory in
    select *
    from public.inventory
    where id = any(v_inventory_ids) and deleted_at is null
    order by id
    for update
  loop
    select coalesce(sum((value ->> 'quantity')::integer), 0)::integer
    into v_required_quantity
    from jsonb_array_elements(v_cart -> 'line_items') as line(value)
    where nullif(trim(value ->> 'inventory_id'), '')::uuid = v_inventory.id;
    update public.inventory
    set reserved_quantity = greatest(coalesce(reserved_quantity, 0) + v_required_quantity, 0)
    where id = v_inventory.id;
  end loop;

  if v_coupon_id is not null and v_coupon_discount > 0 then
    insert into public.coupon_usage (id, coupon_id, user_id, order_id, discount_amount)
    values (gen_random_uuid(), v_coupon_id, v_intent.user_id, v_order_id, v_coupon_discount);
  end if;

  delete from public.cart_items c
  where c.user_id = v_intent.user_id and c.id = any(v_cart_item_ids) and c.deleted_at is null
    and exists (select 1 from jsonb_array_elements(coalesce(v_cart -> 'cart_rows', '[]'::jsonb)) r where (r ->> 'id')::uuid = c.id and (r ->> 'quantity')::integer = c.quantity and coalesce(r ->> 'product_variant_id', '') = coalesce(c.product_variant_id::text, ''));

  update public.payment_intents
  set provider_payment_id = p_provider_payment_id, status = 'finalized', finalized_order_id = v_order_id,
      finalized_at = now(), completed_at = coalesce(completed_at, now())
  where id = v_intent.id;

  return query select v_order_id, v_order_number, false;
end;
$$;

revoke all on function public.create_payment_intent(text, text, numeric, text, text, uuid, uuid, jsonb, jsonb, uuid, uuid, jsonb, jsonb, text, text, uuid) from public;
revoke all on function public.update_payment_intent_status(uuid, text, text, text, text, uuid) from public;
revoke all on function public.finalize_payment_intent(uuid, text, text, numeric, text, text, uuid) from public;
revoke all on function public.create_payment_intent(text, text, numeric, text, text, uuid, uuid, jsonb, jsonb, uuid, uuid, jsonb, jsonb, text, text, uuid) from authenticated;
revoke all on function public.update_payment_intent_status(uuid, text, text, text, text, uuid) from authenticated;
revoke all on function public.finalize_payment_intent(uuid, text, text, numeric, text, text, uuid) from authenticated;
grant execute on function public.create_payment_intent(text, text, numeric, text, text, uuid, uuid, jsonb, jsonb, uuid, uuid, jsonb, jsonb, text, text, uuid) to service_role;
grant execute on function public.update_payment_intent_status(uuid, text, text, text, text, uuid) to service_role;
grant execute on function public.finalize_payment_intent(uuid, text, text, numeric, text, text, uuid) to service_role;
