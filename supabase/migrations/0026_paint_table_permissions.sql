-- PostgREST table privileges are required before row-level security policies
-- can be evaluated. These tables were created by later paint migrations and
-- therefore need their privileges granted explicitly.

grant select on table
  public.shades,
  public.product_shades,
  public.paint_bases,
  public.paint_pricing_rules
to anon, authenticated;

grant insert, update, delete on table
  public.shades,
  public.product_shades,
  public.paint_bases,
  public.paint_pricing_rules
to authenticated;
