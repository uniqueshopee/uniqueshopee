-- Account-deletion cleanup foundation.
--
-- This function is intentionally not called by the Phase 2B endpoint yet.
-- It deletes only categories already approved for hard deletion. It never
-- deletes profiles, orders, order_items, reviews, support data,
-- consultations, coupon usage, or phone verification rows.

create or replace function public.prepare_account_deletion_cleanup(p_auth_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_auth_user_id is null then
    raise exception 'Authentication target is required' using errcode = '22004';
  end if;

  delete from public.addresses
  where user_id = p_auth_user_id;

  delete from public.cart_items
  where user_id = p_auth_user_id;

  delete from public.wishlist_items
  where user_id = p_auth_user_id;

  delete from public.notifications
  where user_id = p_auth_user_id;

  delete from public.paint_calculations
  where user_id = p_auth_user_id;

  delete from public.room_visualizations
  where user_id = p_auth_user_id;

  delete from public.profile_roles
  where profile_id = p_auth_user_id;

  delete from public.phone_auth_credentials
  where user_id = p_auth_user_id;
end;
$$;

comment on function public.prepare_account_deletion_cleanup(uuid) is
  'Server-only transactional cleanup foundation. Deletes only approved child data and intentionally leaves profiles, orders, order_items, reviews, support data, consultations, coupon usage, and phone verification rows untouched.';

revoke execute on function public.prepare_account_deletion_cleanup(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion_cleanup(uuid) to service_role;
