-- Restrict the admin return transition RPC to the trusted server role.
-- The function body and workflow rules are intentionally unchanged.

revoke execute on function public.admin_transition_return(uuid, text, text, text, text)
  from authenticated, public, anon;

grant execute on function public.admin_transition_return(uuid, text, text, text, text)
  to service_role;
