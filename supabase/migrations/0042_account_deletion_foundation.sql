-- Account-deletion foundation.
--
-- This migration only changes the orders-to-profile delete action and adds
-- deletion-request state. It does not delete, update, or anonymize existing
-- customer, order, payment, address, or storage data.

do $$
declare
  v_constraint_name text;
  v_constraint_count integer;
begin
  -- The original FK was declared inline in 0001_initial_schema.sql, so its
  -- generated name is resolved from the live catalog instead of assumed.
  select count(*), min(c.conname)
    into v_constraint_count, v_constraint_name
  from pg_constraint c
  join pg_attribute source_column
    on source_column.attrelid = c.conrelid
   and source_column.attname = 'user_id'
   and source_column.attnum = c.conkey[1]
  join pg_attribute referenced_column
    on referenced_column.attrelid = c.confrelid
   and referenced_column.attname = 'id'
   and referenced_column.attnum = c.confkey[1]
  where c.conrelid = 'public.orders'::regclass
    and c.confrelid = 'public.profiles'::regclass
    and c.contype = 'f'
    and c.confdeltype = 'c'
    and array_length(c.conkey, 1) = 1
    and array_length(c.confkey, 1) = 1;

  if v_constraint_count <> 1 or v_constraint_name is null then
    raise exception
      'Expected exactly one orders.user_id -> profiles.id ON DELETE CASCADE constraint; found %',
      v_constraint_count;
  end if;

  alter table public.orders
    alter column user_id drop not null;

  execute format(
    'alter table public.orders drop constraint %I',
    v_constraint_name
  );

  execute format(
    'alter table public.orders add constraint %I foreign key (user_id) references public.profiles(id) on delete set null',
    v_constraint_name
  );
end;
$$;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  state text not null default 'ACTIVE' check (
    state in (
      'ACTIVE',
      'DELETION_PENDING',
      'DATA_CLEANUP_FAILED',
      'DATA_CLEANED',
      'AUTH_DELETE_FAILED',
      'AUTH_DELETED',
      'FINALIZATION_FAILED',
      'COMPLETED'
    )
  ),
  failure_code text,
  failure_message text,
  retry_count integer not null default 0 check (retry_count >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.account_deletion_requests is
  'Server-managed account deletion state. auth_user_id is an immutable target and intentionally has no profile or auth.users FK so retry state survives account cleanup.';

comment on column public.account_deletion_requests.auth_user_id is
  'Immutable Supabase Auth user ID. Do not populate from arbitrary client input.';

comment on column public.account_deletion_requests.failure_message is
  'Operational error detail only; must not contain passwords, OTPs, tokens, payment credentials, or service-role credentials.';

drop trigger if exists trg_account_deletion_requests_updated_at
  on public.account_deletion_requests;
create trigger trg_account_deletion_requests_updated_at
before update on public.account_deletion_requests
for each row
execute function public.set_updated_at();

alter table public.account_deletion_requests enable row level security;

-- No authenticated/anonymous policy is granted. The future protected server
-- endpoint will use the server-only service-role client for state mutation.
revoke all on table public.account_deletion_requests from anon, authenticated;
grant select, insert, update on table public.account_deletion_requests to service_role;
