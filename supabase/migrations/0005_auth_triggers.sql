create or replace function public.current_user_role_key()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.key
  from public.profiles p
  left join public.roles r on r.id = p.role_id
  where p.id = auth.uid()
    and p.deleted_at is null
    and (r.deleted_at is null or r.id is null)
  limit 1;
$$;

create or replace function public.user_has_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role_key() = any(required_roles), false);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_role_id uuid;
  profile_name text;
  profile_email text;
begin
  select id into customer_role_id
  from public.roles
  where key = 'customer'
    and deleted_at is null
  limit 1;

  profile_name :=
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      nullif(trim(concat_ws(' ', new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name')), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    );

  profile_email :=
    coalesce(
      nullif(new.email, ''),
      nullif(new.raw_user_meta_data ->> 'email', ''),
      lower(replace(new.id::text, '-', '')) || '@auth.local'
    );

  insert into public.profiles (
    id,
    role_id,
    full_name,
    email,
    phone,
    avatar_url,
    customer_code,
    status,
    email_verified_at,
    metadata
  )
  values (
    new.id,
    customer_role_id,
    profile_name,
    profile_email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    'CUS-' || upper(substr(replace(new.id::text, '-', ''), 1, 10)),
    'active',
    new.email_confirmed_at,
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    avatar_url = excluded.avatar_url,
    metadata = excluded.metadata,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
