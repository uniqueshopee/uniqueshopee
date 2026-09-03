-- The browser Supabase client uses the authenticated database role.  These
-- table privileges make the existing admin-only RLS policy enforceable rather
-- than relying on table-level privilege errors.
grant select, insert, update, delete on table public.delivery_pincodes to authenticated;
