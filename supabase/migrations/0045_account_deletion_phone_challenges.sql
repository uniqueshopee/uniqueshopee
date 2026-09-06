-- Account-deletion phone re-authentication challenges.
--
-- This is intentionally separate from phone_verifications, whose purpose
-- constraint remains limited to normal login/signup. No OTP value is stored.

create table if not exists public.account_deletion_phone_challenges (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  phone text not null,
  provider_session_id text not null unique,
  status text not null default 'pending' check (status in ('pending', 'verified', 'expired', 'locked', 'consumed')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  verified_at timestamptz,
  locked_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists account_deletion_phone_challenges_active_user_idx
  on public.account_deletion_phone_challenges (auth_user_id)
  where status = 'pending';

create index if not exists account_deletion_phone_challenges_expiry_idx
  on public.account_deletion_phone_challenges (expires_at);

drop trigger if exists trg_account_deletion_phone_challenges_updated_at
  on public.account_deletion_phone_challenges;
create trigger trg_account_deletion_phone_challenges_updated_at
before update on public.account_deletion_phone_challenges
for each row
execute function public.set_updated_at();

alter table public.account_deletion_phone_challenges enable row level security;
revoke all on table public.account_deletion_phone_challenges from public, anon, authenticated;
grant select, insert, update on table public.account_deletion_phone_challenges to service_role;
