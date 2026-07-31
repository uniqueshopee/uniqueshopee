create table if not exists public.phone_verifications (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  purpose text not null default 'login' check (purpose in ('login', 'signup')),
  session_id text not null unique,
  status text not null default 'pending' check (status in ('pending', 'verified', 'expired', 'locked')),
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  verified_at timestamptz,
  locked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (attempts >= 0),
  check (max_attempts > 0)
);

create index if not exists phone_verifications_phone_status_idx
  on public.phone_verifications (phone, status, sent_at desc);

create index if not exists phone_verifications_session_idx
  on public.phone_verifications (session_id);

create index if not exists phone_verifications_expires_idx
  on public.phone_verifications (expires_at);

drop trigger if exists trg_set_updated_at on public.phone_verifications;
create trigger trg_set_updated_at
before update on public.phone_verifications
for each row
execute function public.set_updated_at();
