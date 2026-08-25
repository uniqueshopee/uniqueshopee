-- Preserve the canonical taxable value and GST amount on historical order
-- lines so later price or tax changes cannot alter the order presentation.
alter table public.order_items
  add column if not exists taxable_value_snapshot numeric(12,2),
  add column if not exists gst_amount_snapshot numeric(12,2);

create or replace function public.snapshot_canonical_order_pricing()
returns trigger
language plpgsql
as $$
begin
  if new.taxable_value_snapshot is null then
    new.taxable_value_snapshot := round(coalesce(new.unit_price, 0) * greatest(coalesce(new.quantity, 1), 1), 2);
  end if;
  if new.gst_amount_snapshot is null then
    new.gst_amount_snapshot := round(new.taxable_value_snapshot * greatest(coalesce(new.gst_rate, 0), 0) / 100, 2);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_snapshot_canonical_order_pricing on public.order_items;
create trigger trg_snapshot_canonical_order_pricing
before insert on public.order_items
for each row execute function public.snapshot_canonical_order_pricing();
