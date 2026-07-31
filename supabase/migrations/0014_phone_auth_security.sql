alter table public.phone_verifications
  add column if not exists locked_until timestamptz;

create index if not exists phone_verifications_locked_until_idx
  on public.phone_verifications (locked_until);

create table if not exists public.phone_auth_credentials (
  phone text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  encrypted_password text not null,
  encryption_iv text not null,
  encryption_tag text not null,
  password_version integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_set_updated_at on public.phone_auth_credentials;
create trigger trg_set_updated_at
before update on public.phone_auth_credentials
for each row
execute function public.set_updated_at();

alter table public.phone_auth_credentials enable row level security;

grant select, insert, update, delete on table public.phone_verifications to service_role;
grant select, insert, update, delete on table public.phone_auth_credentials to service_role;
