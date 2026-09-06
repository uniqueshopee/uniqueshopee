-- Account-deletion crash-safe Auth finalization.
--
-- The deletion endpoint marks its request AUTH_DELETE_IN_PROGRESS before
-- calling Supabase Auth. This trigger runs after the Auth row is actually
-- deleted, so a server crash or lost provider response cannot leave the
-- request permanently incomplete. It also removes only that user's
-- deletion-verification challenges; normal phone_verifications are retained.

create or replace function public.finalize_account_deletion_after_auth_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_request_count integer;
begin
  select count(*)::integer
    into v_request_count
  from public.account_deletion_requests
  where auth_user_id = old.id;

  if v_request_count <> 1 then
    raise exception
      'Expected exactly one account deletion request for deleted Auth user; found %',
      v_request_count;
  end if;

  delete from public.account_deletion_phone_challenges
  where auth_user_id = old.id;

  update public.account_deletion_requests
  set state = 'COMPLETED',
      failure_code = null,
      failure_message = null,
      completed_at = coalesce(completed_at, now())
  where auth_user_id = old.id
    and state in ('AUTH_DELETE_FAILED', 'AUTH_DELETED', 'FINALIZATION_FAILED', 'DATA_CLEANED');

  return old;
end;
$$;

revoke all on function public.finalize_account_deletion_after_auth_delete() from public, anon, authenticated;
grant execute on function public.finalize_account_deletion_after_auth_delete() to service_role;

drop trigger if exists trg_finalize_account_deletion_after_auth_delete on auth.users;
create trigger trg_finalize_account_deletion_after_auth_delete
after delete on auth.users
for each row
execute function public.finalize_account_deletion_after_auth_delete();
