-- UniqueShopee one-time development/test data reset
--
-- DESTRUCTIVE: run this file manually in the Supabase SQL Editor only after
-- reviewing the pre-cleanup counts. Do not run it from the Next.js app.
--
-- This script does not alter persistent schema, RLS policies, auth.users,
-- profiles, roles, brands, categories, departments, paint_bases, settings,
-- or shades. The shades table is intentionally never a DELETE target.
-- If any verification raises an exception, the transaction must be rolled
-- back. Execute `ROLLBACK;` in the SQL Editor and do not manually COMMIT a
-- transaction that failed verification.

BEGIN;

-- Temporary snapshot only; it disappears when the session ends and is not a
-- persistent schema change.
CREATE TEMP TABLE _uniqueshopee_reset_snapshot (
  metric text PRIMARY KEY,
  row_count bigint NOT NULL
) ON COMMIT PRESERVE ROWS;

INSERT INTO _uniqueshopee_reset_snapshot (metric, row_count)
VALUES
  ('shades', (SELECT COUNT(*) FROM public.shades)),
  ('products', (SELECT COUNT(*) FROM public.products)),
  ('product_variants', (SELECT COUNT(*) FROM public.product_variants)),
  ('product_images', (SELECT COUNT(*) FROM public.product_images)),
  ('inventory', (SELECT COUNT(*) FROM public.inventory)),
  ('product_shades', (SELECT COUNT(*) FROM public.product_shades)),
  ('orders', (SELECT COUNT(*) FROM public.orders)),
  ('order_items', (SELECT COUNT(*) FROM public.order_items)),
  ('cart_items', (SELECT COUNT(*) FROM public.cart_items)),
  ('wishlist_items', (SELECT COUNT(*) FROM public.wishlist_items)),
  ('reviews', (SELECT COUNT(*) FROM public.reviews)),
  ('consultations', (SELECT COUNT(*) FROM public.consultations)),
  ('paint_pricing_rules', (SELECT COUNT(*) FROM public.paint_pricing_rules)),
  ('coupon_usage', (SELECT COUNT(*) FROM public.coupon_usage)),
  ('support_tickets', (SELECT COUNT(*) FROM public.support_tickets)),
  ('support_ticket_replies', (SELECT COUNT(*) FROM public.support_ticket_replies)),
  ('banners', (SELECT COUNT(*) FROM public.banners));

-- Review these counts before allowing the destructive statements below.
SELECT metric, row_count AS count_before
FROM _uniqueshopee_reset_snapshot
ORDER BY metric;

-- Product/order dependency summary from the repository migrations:
-- products are referenced by product_images, product_variants, cart_items,
-- wishlist_items, order_items (RESTRICT), reviews, banners (SET NULL),
-- support_tickets (SET NULL), consultations, product_shades, and
-- paint_pricing_rules. product_variants are referenced by inventory,
-- cart_items, wishlist_items, order_items, and paint_pricing_rules.
-- orders are referenced by order_items (CASCADE), coupon_usage (SET NULL),
-- and support_tickets (SET NULL). order_items are referenced by reviews
-- (SET NULL). shades are referenced by product_shades (CASCADE), product
-- variants/cart/order items (SET NULL), and pricing rules (CASCADE).

-- First remove order items because order_items.product_id has ON DELETE
-- RESTRICT against products. Reviews referencing these items are retained
-- only if they are not product-linked; all reviews here are product-linked
-- and are cleared below.
DELETE FROM public.order_items;

-- Coupon redemption history belongs to deleted orders. The FK is
-- coupon_usage.order_id -> orders.id ON DELETE SET NULL, so remove only
-- usage rows currently associated with an order being reset. Coupon
-- definitions and any already-unlinked usage rows are preserved.
DELETE FROM public.coupon_usage
WHERE order_id IN (SELECT id FROM public.orders);

-- Support tickets are user data, so preserve order-only tickets by removing
-- their historical order pointer. Product-linked tickets belong exclusively
-- to deleted catalogue records; deleting them also removes their replies via
-- the repository-defined CASCADE relationship.
DELETE FROM public.support_tickets
WHERE product_id IS NOT NULL;

UPDATE public.support_tickets
SET order_id = NULL
WHERE order_id IS NOT NULL;

-- All order children and order-linked references have now been handled.
-- Delete every order header so the Admin Orders page and order APIs are empty.
DELETE FROM public.orders;

-- Banners are shared marketing records. Clear stale product pointers without
-- deleting the banner itself (the FK is ON DELETE SET NULL).
UPDATE public.banners
SET product_id = NULL
WHERE product_id IS NOT NULL;

-- Clear user/product records and product-specific configuration. Each of these
-- tables has a product or product-variant foreign key in the migrations.
DELETE FROM public.cart_items;
DELETE FROM public.wishlist_items;
DELETE FROM public.reviews;
DELETE FROM public.consultations;
DELETE FROM public.paint_pricing_rules;
DELETE FROM public.product_shades;
DELETE FROM public.product_images;
DELETE FROM public.inventory;
DELETE FROM public.product_variants;

-- Final product deletion. Shared brands, categories, departments, paint_bases,
-- and the complete shades catalogue are not touched.
DELETE FROM public.products;

-- Any failure here aborts the transaction. The SQL Editor should leave the
-- transaction uncommitted; execute ROLLBACK if it reports an exception.
DO $$
DECLARE
  shade_count_before bigint;
  shade_count_after bigint;
  remaining_products bigint;
  remaining_variants bigint;
  remaining_images bigint;
  remaining_inventory bigint;
  remaining_product_shades bigint;
  remaining_orders bigint;
  remaining_order_items bigint;
  remaining_cart_items bigint;
  remaining_wishlist_items bigint;
  remaining_reviews bigint;
  remaining_consultations bigint;
  remaining_pricing_rules bigint;
  remaining_coupon_usage_links bigint;
  remaining_product_tickets bigint;
  remaining_order_links bigint;
  remaining_banner_links bigint;
BEGIN
  SELECT row_count INTO shade_count_before
  FROM _uniqueshopee_reset_snapshot
  WHERE metric = 'shades';

  SELECT COUNT(*) INTO shade_count_after FROM public.shades;
  SELECT COUNT(*) INTO remaining_products FROM public.products;
  SELECT COUNT(*) INTO remaining_variants FROM public.product_variants;
  SELECT COUNT(*) INTO remaining_images FROM public.product_images;
  SELECT COUNT(*) INTO remaining_inventory FROM public.inventory;
  SELECT COUNT(*) INTO remaining_product_shades FROM public.product_shades;
  SELECT COUNT(*) INTO remaining_orders FROM public.orders;
  SELECT COUNT(*) INTO remaining_order_items FROM public.order_items;
  SELECT COUNT(*) INTO remaining_cart_items FROM public.cart_items;
  SELECT COUNT(*) INTO remaining_wishlist_items FROM public.wishlist_items;
  SELECT COUNT(*) INTO remaining_reviews FROM public.reviews;
  SELECT COUNT(*) INTO remaining_consultations FROM public.consultations;
  SELECT COUNT(*) INTO remaining_pricing_rules FROM public.paint_pricing_rules;
  SELECT COUNT(*) INTO remaining_coupon_usage_links
  FROM public.coupon_usage
  WHERE order_id IS NOT NULL;
  SELECT COUNT(*) INTO remaining_product_tickets FROM public.support_tickets WHERE product_id IS NOT NULL;
  SELECT COUNT(*) INTO remaining_order_links FROM public.support_tickets WHERE order_id IS NOT NULL;
  SELECT COUNT(*) INTO remaining_banner_links FROM public.banners WHERE product_id IS NOT NULL;

  IF shade_count_after <> shade_count_before
     OR remaining_products <> 0
     OR remaining_variants <> 0
     OR remaining_images <> 0
     OR remaining_inventory <> 0
     OR remaining_product_shades <> 0
     OR remaining_orders <> 0
     OR remaining_order_items <> 0
     OR remaining_cart_items <> 0
     OR remaining_wishlist_items <> 0
     OR remaining_reviews <> 0
     OR remaining_consultations <> 0
     OR remaining_pricing_rules <> 0
     OR remaining_coupon_usage_links <> 0
     OR remaining_product_tickets <> 0
     OR remaining_order_links <> 0
     OR remaining_banner_links <> 0 THEN
    RAISE EXCEPTION 'Reset verification failed; run ROLLBACK. shades before=%, after=%, products=%, variants=%, images=%, inventory=%, product_shades=%, orders=%, order_items=%, carts=%, wishlists=%, reviews=%, consultations=%, pricing=%, coupon_usage=%, product_tickets=%, order_links=%, banner_links=%',
      shade_count_before, shade_count_after, remaining_products,
      remaining_variants, remaining_images, remaining_inventory,
      remaining_product_shades, remaining_orders, remaining_order_items,
      remaining_cart_items, remaining_wishlist_items, remaining_reviews,
      remaining_consultations, remaining_pricing_rules, remaining_coupon_usage_links,
      remaining_product_tickets, remaining_order_links, remaining_banner_links;
  END IF;
END;
$$;

-- Required in-transaction verification report. If the DO block above did not
-- raise, these are the values that will be committed.
SELECT 'SHADE COUNT BEFORE' AS metric, row_count AS value
FROM _uniqueshopee_reset_snapshot WHERE metric = 'shades'
UNION ALL SELECT 'SHADE COUNT AFTER', COUNT(*) FROM public.shades
UNION ALL SELECT 'PRODUCT COUNT AFTER', COUNT(*) FROM public.products
UNION ALL SELECT 'PRODUCT VARIANT COUNT AFTER', COUNT(*) FROM public.product_variants
UNION ALL SELECT 'PRODUCT IMAGE COUNT AFTER', COUNT(*) FROM public.product_images
UNION ALL SELECT 'INVENTORY COUNT AFTER', COUNT(*) FROM public.inventory
UNION ALL SELECT 'PRODUCT COMPATIBILITY COUNT AFTER', COUNT(*) FROM public.product_shades
UNION ALL SELECT 'ORDER COUNT AFTER', COUNT(*) FROM public.orders
UNION ALL SELECT 'ORDER ITEM COUNT AFTER', COUNT(*) FROM public.order_items
UNION ALL SELECT 'CART ITEM COUNT AFTER', COUNT(*) FROM public.cart_items
UNION ALL SELECT 'WISHLIST ITEM COUNT AFTER', COUNT(*) FROM public.wishlist_items
UNION ALL SELECT 'REVIEW COUNT AFTER', COUNT(*) FROM public.reviews
UNION ALL SELECT 'CONSULTATION COUNT AFTER', COUNT(*) FROM public.consultations
UNION ALL SELECT 'PAINT PRICING RULE COUNT AFTER', COUNT(*) FROM public.paint_pricing_rules
UNION ALL SELECT 'COUPON USAGE LINKED TO ORDERS AFTER', COUNT(*) FROM public.coupon_usage WHERE order_id IS NOT NULL
UNION ALL SELECT 'COUPON USAGE TOTAL AFTER (UNLINKED RECORDS PRESERVED)', COUNT(*) FROM public.coupon_usage
UNION ALL SELECT 'PRODUCT-LINKED SUPPORT TICKETS AFTER', COUNT(*) FROM public.support_tickets WHERE product_id IS NOT NULL
UNION ALL SELECT 'ORDER-LINKED SUPPORT TICKETS AFTER', COUNT(*) FROM public.support_tickets WHERE order_id IS NOT NULL
UNION ALL SELECT 'PRODUCT-LINKED BANNERS AFTER', COUNT(*) FROM public.banners WHERE product_id IS NOT NULL;

-- Commit only after the verification above succeeds.
COMMIT;

-- After COMMIT, refresh the Admin Products, Paint Compatibility, Orders, and
-- Shades pages. Products and orders should be empty; all 1,588 shade records
-- should remain available for future compatibility assignments.
