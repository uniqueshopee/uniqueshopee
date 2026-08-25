-- Preserve the selected paint HEX value in the server-backed cart.
alter table public.cart_items
  add column if not exists hex_color_snapshot text;
