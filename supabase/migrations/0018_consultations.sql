create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  full_name text not null,
  phone text not null,
  preferred_slot text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'contacted', 'completed', 'cancelled')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'consultations'
  loop
    execute format('drop policy if exists %I on public.consultations;', pol.policyname);
  end loop;
end;
$$;

alter table public.consultations enable row level security;

drop policy if exists consultations_owner_or_admin_select on public.consultations;
create policy consultations_owner_or_admin_select
on public.consultations
for select
using (auth.uid() = user_id or public.is_admin_user());

drop policy if exists consultations_owner_insert on public.consultations;
create policy consultations_owner_insert
on public.consultations
for insert
with check (auth.uid() = user_id);

drop policy if exists consultations_admin_manage on public.consultations;
create policy consultations_admin_manage
on public.consultations
for update
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists consultations_admin_delete on public.consultations;
create policy consultations_admin_delete
on public.consultations
for delete
using (public.is_admin_user());
