-- Return/refund database foundation.
--
-- This migration adds normalized return and refund records for new workflow
-- work. Existing support_tickets rows, including category = 'Returns', are
-- intentionally untouched. No order/payment statuses or provider calls are
-- performed here.

create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  order_id uuid not null references public.orders(id) on delete restrict,
  status text not null default 'RETURN_REQUESTED' check (
    status in (
      'RETURN_REQUESTED',
      'RETURN_APPROVED',
      'PICKUP_SCHEDULED',
      'PICKED_UP',
      'RECEIVED',
      'UNDER_INSPECTION',
      'REFUND_PENDING',
      'REFUNDED',
      'RETURN_REJECTED'
    )
  ),
  customer_reason text not null,
  admin_rejection_reason text,
  pickup_option text,
  pickup_location text,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  picked_up_at timestamptz,
  received_at timestamptz,
  inspection_started_at timestamptz,
  inspected_at timestamptz,
  inspection_result text check (inspection_result is null or inspection_result in ('GOOD', 'FAILED')),
  inspection_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status <> 'RETURN_REQUESTED'
    or (
      approved_at is null and rejected_at is null and picked_up_at is null
      and received_at is null and inspection_started_at is null
      and inspected_at is null and inspection_result is null
      and inspection_notes is null and admin_rejection_reason is null
    )
  ),
  check (status <> 'RETURN_REJECTED' or rejected_at is not null),
  check (status <> 'REFUNDED' or inspected_at is not null)
);

comment on table public.returns is
  'Normalized return workflow records. New returns must not be represented as support_tickets.';
comment on column public.returns.status is
  'Server-managed workflow state. Customers may only create RETURN_REQUESTED.';
comment on column public.returns.customer_reason is
  'Customer-provided reason; eligibility and approval are server/admin decisions.';

create table if not exists public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.returns(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  requested_quantity integer not null check (requested_quantity > 0),
  approved_quantity integer check (approved_quantity is null or (approved_quantity >= 0 and approved_quantity <= requested_quantity)),
  product_name_snapshot text not null,
  unit_price_snapshot numeric(12,2) not null check (unit_price_snapshot >= 0),
  discount_amount_snapshot numeric(12,2) not null check (discount_amount_snapshot >= 0),
  base_price_snapshot numeric(12,2) not null check (base_price_snapshot >= 0),
  shade_extra_price_snapshot numeric(12,2) not null check (shade_extra_price_snapshot >= 0),
  final_unit_price_snapshot numeric(12,2) not null check (final_unit_price_snapshot >= 0),
  taxable_value_snapshot numeric(12,2) not null check (taxable_value_snapshot >= 0),
  gst_amount_snapshot numeric(12,2) not null check (gst_amount_snapshot >= 0),
  total_amount_snapshot numeric(12,2) not null check (total_amount_snapshot >= 0),
  refundable_amount numeric(12,2) check (refundable_amount is null or refundable_amount > 0),
  inspection_condition text,
  inspection_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.return_items is
  'Return-line records containing immutable order pricing snapshots; values are server-authored, never browser-authored.';
comment on column public.return_items.refundable_amount is
  'Final approved merchandise refund amount. Null until calculated by a trusted server operation.';

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.returns(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete set null,
  refund_method text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency char(3) not null default 'INR',
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  razorpay_payment_id text,
  razorpay_refund_id text,
  provider_response jsonb not null default '{}'::jsonb,
  failure_code text,
  failure_message text,
  idempotency_key text not null,
  requested_at timestamptz not null default now(),
  initiated_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.refunds is
  'Server-managed refund attempts and provider references. This foundation does not call any payment provider.';
comment on column public.refunds.amount is
  'Server-calculated positive amount from immutable order snapshots; never accept from a customer client.';
comment on column public.refunds.idempotency_key is
  'Stable server-generated key used to prevent duplicate refund attempts.';

drop trigger if exists trg_returns_updated_at on public.returns;
create trigger trg_returns_updated_at
before update on public.returns
for each row
execute function public.set_updated_at();

drop trigger if exists trg_return_items_updated_at on public.return_items;
create trigger trg_return_items_updated_at
before update on public.return_items
for each row
execute function public.set_updated_at();

drop trigger if exists trg_refunds_updated_at on public.refunds;
create trigger trg_refunds_updated_at
before update on public.refunds
for each row
execute function public.set_updated_at();

create index if not exists returns_user_id_idx on public.returns (user_id);
create index if not exists returns_order_id_idx on public.returns (order_id);
create index if not exists returns_status_idx on public.returns (status);
create index if not exists return_items_return_id_idx on public.return_items (return_id);
create index if not exists return_items_order_item_id_idx on public.return_items (order_item_id);
create unique index if not exists return_items_one_row_per_return_item_idx
    on public.return_items (return_id, order_item_id);
create index if not exists refunds_return_id_idx on public.refunds (return_id);
create index if not exists refunds_order_id_idx on public.refunds (order_id);
create index if not exists refunds_user_id_idx on public.refunds (user_id);
create index if not exists refunds_status_idx on public.refunds (status);

-- A rejected or completed return is historical. PostgreSQL partial-index
-- predicates cannot contain a subquery into public.returns, so duplicate
-- protection is enforced by a transaction-safe trigger instead. The advisory
-- lock closes the race between two concurrent inserts for one order item.
create or replace function public.prevent_active_return_item_duplicate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_quantity integer;
  v_return_order_id uuid;
  v_order_item_order_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.order_item_id::text, 0));

  select r.order_id
    into v_return_order_id
  from public.returns r
  where r.id = new.return_id;

  select oi.order_id
    into v_order_item_order_id
  from public.order_items oi
  where oi.id = new.order_item_id;

  if v_return_order_id is distinct from v_order_item_order_id then
    raise exception 'Return item must belong to the return order'
      using errcode = '23503';
  end if;

  select oi.quantity
    into v_order_quantity
  from public.order_items oi
  where oi.id = new.order_item_id;

  if coalesce((
    select sum(ri.requested_quantity)
    from public.return_items ri
    join public.returns r on r.id = ri.return_id
    where ri.order_item_id = new.order_item_id
      and ri.id <> new.id
      and r.status in (
        'RETURN_REQUESTED',
        'RETURN_APPROVED',
        'PICKUP_SCHEDULED',
        'PICKED_UP',
        'RECEIVED',
        'UNDER_INSPECTION',
        'REFUND_PENDING'
      )
  ), 0) + new.requested_quantity > v_order_quantity then
    raise exception 'Active return quantities exceed the purchased quantity for this order item'
      using errcode = '23505';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_active_return_item_duplicate() from public, anon, authenticated;
grant execute on function public.prevent_active_return_item_duplicate() to service_role;

drop trigger if exists trg_prevent_active_return_item_duplicate on public.return_items;
create constraint trigger trg_prevent_active_return_item_duplicate
after insert or update of order_item_id, return_id, requested_quantity on public.return_items
deferrable initially immediate
for each row
execute function public.prevent_active_return_item_duplicate();

create or replace function public.prevent_active_return_status_duplicate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_item_id uuid;
  v_order_quantity integer;
begin
  if new.status not in (
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
    'PICKUP_SCHEDULED',
    'PICKED_UP',
    'RECEIVED',
    'UNDER_INSPECTION',
    'REFUND_PENDING'
  ) then
    return new;
  end if;

  for v_order_item_id in
    select order_item_id
    from public.return_items
    where return_id = new.id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_order_item_id::text, 0));

    select oi.quantity
      into v_order_quantity
    from public.order_items oi
    where oi.id = v_order_item_id;

    if coalesce((
      select sum(ri.requested_quantity)
      from public.return_items ri
      join public.returns r on r.id = ri.return_id
      where ri.order_item_id = v_order_item_id
        and r.status in (
          'RETURN_REQUESTED',
          'RETURN_APPROVED',
          'PICKUP_SCHEDULED',
          'PICKED_UP',
          'RECEIVED',
          'UNDER_INSPECTION',
          'REFUND_PENDING'
        )
    ), 0) > v_order_quantity then
      raise exception 'Active return quantities exceed the purchased quantity for this order item'
        using errcode = '23505';
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.prevent_active_return_status_duplicate() from public, anon, authenticated;
grant execute on function public.prevent_active_return_status_duplicate() to service_role;

drop trigger if exists trg_prevent_active_return_status_duplicate on public.returns;
create constraint trigger trg_prevent_active_return_status_duplicate
after update of status on public.returns
deferrable initially immediate
for each row
execute function public.prevent_active_return_status_duplicate();

create or replace function public.validate_refund_ownership_consistency()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_return_order_id uuid;
  v_return_user_id uuid;
begin
  select r.order_id, r.user_id
    into v_return_order_id, v_return_user_id
  from public.returns r
  where r.id = new.return_id;

  if not found then
    raise exception 'Refund must reference an existing return'
      using errcode = '23503';
  end if;

  if new.order_id is distinct from v_return_order_id then
    raise exception 'Refund order must match the referenced return order'
      using errcode = '23514';
  end if;

  -- NULL is the retained-history value used during profile deletion. A
  -- non-NULL refund owner must still match the authoritative return owner.
  if new.user_id is not null and new.user_id is distinct from v_return_user_id then
    raise exception 'Refund customer must match the referenced return customer'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_refund_ownership_consistency() from public, anon, authenticated;
grant execute on function public.validate_refund_ownership_consistency() to service_role;

drop trigger if exists trg_validate_refund_ownership_consistency on public.refunds;
create trigger trg_validate_refund_ownership_consistency
before insert or update of return_id, order_id, user_id on public.refunds
for each row
execute function public.validate_refund_ownership_consistency();

create unique index if not exists refunds_idempotency_key_idx
  on public.refunds (idempotency_key);

create unique index if not exists refunds_one_nonfailed_per_return_idx
  on public.refunds (return_id)
  where status in ('PENDING', 'PROCESSING', 'COMPLETED');

alter table public.returns enable row level security;
alter table public.return_items enable row level security;
alter table public.refunds enable row level security;

revoke all on table public.returns, public.return_items, public.refunds from anon;
grant select, insert, update, delete on table public.returns to authenticated;
grant select, insert, update, delete on table public.return_items, public.refunds to authenticated;
grant all on table public.returns, public.return_items, public.refunds to service_role;

drop policy if exists returns_customer_select on public.returns;
create policy returns_customer_select
on public.returns
for select
using (auth.uid() = user_id);

drop policy if exists returns_customer_insert_requested on public.returns;
create policy returns_customer_insert_requested
on public.returns
for insert
with check (
    auth.uid() = user_id
    and exists (
        select 1
        from public.orders o
        where o.id = public.returns.order_id
          and o.user_id = auth.uid()
    )
    and status = 'RETURN_REQUESTED'
);

drop policy if exists returns_admin_manage on public.returns;
create policy returns_admin_manage
on public.returns
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists return_items_customer_select on public.return_items;
create policy return_items_customer_select
on public.return_items
for select
using (
  exists (
    select 1
    from public.returns r
    where r.id = return_items.return_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists return_items_admin_manage on public.return_items;
create policy return_items_admin_manage
on public.return_items
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists refunds_customer_select on public.refunds;
create policy refunds_customer_select
on public.refunds
for select
using (
  exists (
    select 1
    from public.returns r
    where r.id = refunds.return_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists refunds_admin_manage on public.refunds;
create policy refunds_admin_manage
on public.refunds
for all
using (public.is_admin_user())
with check (public.is_admin_user());
