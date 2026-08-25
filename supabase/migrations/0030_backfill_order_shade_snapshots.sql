-- Ensure older paint orders also expose the shade information already stored by shade_id.
update public.order_items oi
set
  shade_name_snapshot = coalesce(oi.shade_name_snapshot, s.shade_name),
  shade_code_snapshot = coalesce(oi.shade_code_snapshot, s.shade_code),
  colour_family_snapshot = coalesce(oi.colour_family_snapshot, s.color_family),
  hex_color_snapshot = coalesce(oi.hex_color_snapshot, s.hex_color)
from public.shades s
where oi.shade_id = s.id
  and oi.deleted_at is null
  and (
    oi.shade_name_snapshot is null
    or oi.shade_code_snapshot is null
    or oi.colour_family_snapshot is null
    or oi.hex_color_snapshot is null
  );
