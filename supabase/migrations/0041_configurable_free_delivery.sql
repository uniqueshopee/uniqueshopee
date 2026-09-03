-- Reuse the existing checkout shipping policy as the single free-delivery
-- configuration consumed by checkout and the public cart banner.
insert into public.settings (scope, key, value, description, is_public)
values (
  'global',
  'checkout_shipping_policy',
  '{"enabled": true, "free_over": 5000, "flat_rate": 99}'::jsonb,
  'Free-delivery threshold and checkout shipping policy.',
  true
)
on conflict (key) do update
set is_public = true,
    description = coalesce(public.settings.description, excluded.description),
    updated_at = now();

create or replace function public.resolve_checkout_shipping(p_taxable_amount numeric)
returns numeric
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_free_over numeric(12,2) := 5000;
  v_flat_rate numeric(12,2) := 99;
  v_enabled boolean := true;
  v_policy jsonb;
begin
  select value into v_policy
  from public.settings
  where key = 'checkout_shipping_policy'
    and deleted_at is null
  order by updated_at desc
  limit 1;

  if v_policy is not null then
    v_enabled := coalesce((v_policy ->> 'enabled')::boolean, true);
    v_free_over := coalesce((v_policy ->> 'free_over')::numeric, v_free_over);
    v_flat_rate := coalesce((v_policy ->> 'flat_rate')::numeric, v_flat_rate);
  end if;

  if v_enabled and coalesce(p_taxable_amount, 0) >= v_free_over then
    return 0;
  end if;

  return greatest(v_flat_rate, 0);
end;
$$;
