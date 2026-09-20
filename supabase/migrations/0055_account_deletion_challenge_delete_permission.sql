-- Allow the server-only account deletion worker to remove consumed
-- verification challenges after a successful deletion request.
grant delete on table public.account_deletion_phone_challenges to service_role;
