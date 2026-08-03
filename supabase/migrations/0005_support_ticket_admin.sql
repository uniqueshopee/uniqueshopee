drop policy if exists support_tickets_admin_manage on public.support_tickets;
create policy support_tickets_admin_manage
on public.support_tickets
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists support_ticket_replies_admin_manage on public.support_ticket_replies;
create policy support_ticket_replies_admin_manage
on public.support_ticket_replies
for all
using (public.is_admin_user())
with check (public.is_admin_user());
