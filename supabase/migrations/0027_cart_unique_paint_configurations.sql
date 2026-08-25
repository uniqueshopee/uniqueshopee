-- A generic paint variant can legitimately have multiple cart lines when the
-- customer chooses different shades, pack sizes, or finishes.
drop index if exists public.idx_cart_items_unique_active;

create unique index if not exists idx_cart_items_unique_active
  on public.cart_items (
    user_id,
    product_id,
    coalesce(product_variant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(shade_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(pack_size_snapshot, ''),
    coalesce(finish_snapshot, '')
  )
  where deleted_at is null;
