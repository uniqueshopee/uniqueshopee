# UniqueShopee Web Paint Shade / Configuration Reference

This document records the current web implementation as inspected on 2026-08-24. It is a source reference for the separate Android project. It does not prescribe a redesign.

## Source files inspected

Primary implementation:

- `src/lib/catalog.ts`
- `src/lib/pricing-engine.ts`
- `src/lib/checkout-pricing.ts`
- `src/lib/cart-service.ts`
- `src/lib/variant-pricing.ts`
- `src/lib/product-detail-data.ts`
- `src/types/index.ts`
- `src/components/product/product-detail-page.tsx`
- `src/components/product/paint-configuration-picker.tsx`
- `app/api/paint/shades/route.ts`
- `app/api/paint/shades/families/route.ts`

Migrations inspected:

- `supabase/migrations/0020_shade_system.sql`
- `supabase/migrations/0023_paint_order_snapshot_and_compatibility.sql`
- `supabase/migrations/0025_product_variant_defaults.sql`
- `supabase/migrations/0026_compatible_reusable_shade_cart_validation.sql`
- `supabase/migrations/0027_cart_unique_paint_configurations.sql`
- `supabase/migrations/0029_order_pricing_snapshots.sql`
- `supabase/migrations/0030_backfill_order_shade_snapshots.sql`
- `supabase/migrations/0031_preserve_variant_shade_on_orders.sql`
- `supabase/migrations/0032_cart_hex_snapshot.sql`
- `supabase/migrations/0033_fix_checkout_paint_order_snapshot.sql`
- `supabase/migrations/0034_selected_shade_pricing_authority.sql`
- `supabase/migrations/0035_consolidate_berger_paint_products.sql`

## 1. Data model and product → variant relationship

The product is the parent record in `products`. A product can have many records in `product_variants`, linked by `product_variants.product_id`.

The relevant `product_variants` fields are:

- `id`
- `product_id`
- `sku`
- `variant_name`
- `option_label`
- `option_value`
- `variant_options`
- `shade_id`
- `pack_size`
- `unit`
- `finish`
- `base_price`
- `shade_extra_price`
- `adjustment_type`
- `final_price`
- `mrp_override`
- `selling_price_override`
- `is_available`
- `is_active`
- `is_default`
- `deleted_at`
- shade snapshot fields: `shade_code_snapshot`, `shade_name_snapshot`, `color_family_snapshot`, `hex_color_snapshot`

`src/lib/catalog.ts`, `getLiveProductBySlug`, maps each active product variant into the public `ProductDetail.variants` shape. The mapped variant retains the variant ID and its finish, pack size, unit, shade ID, shade metadata, pricing fields, SKU, stock, and availability.

Product-level catalog loading filters products to `status = 'active'` and `deleted_at IS NULL`. Variant rows are grouped by `product_id`; deleted variants are removed. Product-level catalog construction also calculates price from the minimum available variant base/selling price when variants exist.

`src/components/product/product-detail-page.tsx` uses the selected variant as the purchasable configuration. For paint products, `shadeVariants` contains variants having a finish, pack size, or shade ID. `findShadeVariant` resolves the current combination by shade ID, pack size, and finish, with fallbacks to an unshaded matching variant, a shade-only match, the default variant, and finally the first variant.

## 2. Finish representation and available finishes

Finish is a nullable text column: `product_variants.finish` and `product_shades.finish`.

In `src/components/product/paint-configuration-picker.tsx`, `finishes` is derived from all supplied variants:

1. Read `variant.finish`.
2. Trim it.
3. Drop empty values.
4. Deduplicate case-insensitively while preserving the first spelling.

The UI displays one button per resulting finish. The selected finish is compared to the button value for visual selection.

The picker does not invent finish names and does not load a separate finish table. Finish availability is therefore the set of non-empty finish values present in the product’s variant rows.

## 3. Finish compatibility

Compatibility is represented by `product_shades` rows. The relevant fields are:

- `product_id`
- `shade_id`
- `finish`
- `is_available`
- `sort_order`
- `deleted_at`

The finish compatibility rule is case-insensitive equality after trimming. A mapping is compatible when either:

- `product_shades.finish IS NULL`, or
- `lower(trim(product_shades.finish)) = lower(trim(selected finish))`.

This rule is implemented in both shade API routes and cart validation. A null mapping finish is a wildcard for all finishes.

## 4. Colour-family logic

Colour is not a separate database entity in the inspected implementation. The UI presents colour families derived from compatible shade rows.

`app/api/paint/shades/families/route.ts`:

1. Requires `productId`.
2. Accepts optional `finish`.
3. Reads `product_shades` where:
   - `product_id = productId`
   - `is_available = true`
   - `deleted_at IS NULL`
4. Joins active, non-deleted `shades` rows.
5. Applies the finish rule above.
6. Deduplicates by shade ID.
7. Groups by normalized `shades.color_family`.
8. Returns `{ name, count, swatch }` for each family.

The family name is trimmed and whitespace-normalized. Group keys are case-insensitive. The first non-null shade `hex_color` becomes the family swatch; later rows only fill the swatch if it is still empty. Families are sorted with `localeCompare` by name.

The picker displays the family name, family swatch, and compatible shade count. Selecting a family moves the picker to the shade stage and clears the shade search and filters.

## 5. Shade fields and filtering

The `shades` table fields used by the web are:

- `id`
- `brand_id`
- `shade_code`
- `shade_name`
- `color_family`
- `color_sub_family`
- `hex_color`
- `rgb`
- `image_url`
- `tone`
- `depth`
- `base_id`
- `is_popular`
- `is_featured`
- `is_active`
- `sort_order`
- `deleted_at`

`app/api/paint/shades/route.ts` first loads compatible mapping rows from `product_shades` in pages of 1,000, filtered by product, `is_available = true`, and `deleted_at IS NULL`. It applies the optional finish compatibility rule, deduplicates shade IDs, and loads matching `shades` rows in ID chunks of 250.

Shade rows are accepted only when `is_active = true` and `deleted_at IS NULL`.

The optional shade filters are:

- `colourFamily`: case-insensitive equality against `color_family`.
- `search`: case-insensitive containment against `shade_name` or `shade_code`.
- `depth = light`: shade depth `light`.
- `depth = dark`: shade depth `dark`.
- `depth = medium`: used by the UI’s `rich` filter.
- `tone = neutral`: used by the UI’s `soft` filter.

The API returns at most 24 shades per page. Duplicate shade IDs are removed before filtering and pagination.

Ordering in `app/api/paint/shades/route.ts` is:

1. `is_popular` descending when `mode=popular`.
2. `is_featured` descending.
3. `sort_order` ascending.
4. `shade_name` ascending using locale comparison.

The normal picker requests `mode=all`, so featured/popular do not receive a special first position; `sort_order` and then shade name determine the normal order.

The picker debounces shade requests by 280 ms, resets pagination when family, search, filter, finish, or modal stage changes, deduplicates items across pages, and supports `hasMore` pagination.

## 6. Finish → colour → shade → pack-size / variant flow

### Finish

The product detail page initializes `selectedFinish` from the default shade variant’s finish, falling back to the first shade variant’s finish. The picker displays all unique non-empty variant finishes.

When finish changes, `PaintConfigurationPicker` resets its colour family, shade list, search, filters, pagination, and errors. If a shade was selected, it calls `onShadeChange("")`, clearing the selected shade.

The product detail page then resolves a variant using the new finish and the remaining selection state. Invalid pack-size/shade combinations fall back through `findShadeVariant` and the effect that fills missing pack size or finish from a matching/default variant.

### Colour family

Opening the colour picker requests `/api/paint/shades/families?productId=...&finish=...`. The colour button is disabled without a product ID or selected finish.

Selecting a family stores the family name locally and moves to the shade stage. It does not itself select a shade.

### Shade

The shade request is `/api/paint/shades` with:

- `productId`
- `colourFamily`
- `page`
- optional `finish`
- optional `search`
- optional `depth`
- optional `tone`

Selecting a shade calls `onShadeChange(shade.id, shade)` and closes the modal. The product detail page stores both the selected shade ID and the selected catalogue shade metadata.

If a newly selected shade is not compatible with the current finish, the API will not return it. Cart validation independently rejects incompatible selections.

### Pack size / variant

Pack sizes are derived from variants that satisfy the current selected shade and selected finish:

```text
(!selectedShadeId || !variant.shadeId || variant.shadeId === selectedShadeId)
AND
(!selectedFinish || lower(trim(variant.finish)) = lower(trim(selectedFinish)))
```

Unique non-empty `variant.packSize` values are displayed. The displayed unit is taken from the first matching variant with that pack size.

Selecting a pack size updates `selectedPackSize`. The resolved variant must match shade, pack size, and finish when possible.

## 7. What changes clear or revalidate

- Finish change clears the selected shade in the picker and resets colour/shade browsing state.
- Changing the selected shade clears `selectedShadeOverride` if its ID no longer matches the selected shade ID.
- A selected shade, pack size, and finish are re-resolved against the current variant list on every relevant state change.
- If an exact combination is absent, the web falls back to a same-shade variant, default variant, or first variant for display resolution.
- Add-to-cart uses strict validation and does not accept an invalid combination merely because display fallback found a variant.
- A missing or invalid variant causes `validateCartAddition` to reject the add operation.
- A deleted/inactive shade or missing compatible `product_shades` mapping causes rejection.

## 8. Product variants and shade variants

`src/lib/catalog.ts`, `getLiveProductBySlug`, creates the detail variant list from `product_variants`. A variant with `shade_id` is shade-associated. A paint product may also have variants distinguished by `finish`, `pack_size`, and `unit`.

For each variant, catalogue mapping resolves:

- shade name/code/family/sub-family/hex from the referenced `shades` row when available;
- otherwise the corresponding variant snapshot fields;
- normalized finish via `normalizeFinish`;
- base price and shade adjustment through `calculateVariantPrice`.

The database uniqueness index created by `0020_shade_system.sql` treats the combination of product, shade, pack size, unit, and finish as the unique live variant combination, with nulls coalesced to empty/default values.

## 9. Pricing authority

The canonical RPC is:

```text
public.resolve_paint_configuration_price(p_variant_id uuid, p_shade_id uuid default null)
```

The web calls it from `src/lib/cart-service.ts`, function `resolveCartPricing`, with:

- `p_variant_id: variant.id`
- `p_shade_id: selected shade ID, or null`

The RPC returns:

- `base_price`
- `shade_adjustment`
- `final_price`
- `rule_id`

`supabase/migrations/0034_selected_shade_pricing_authority.sql` defines the rule hierarchy. It validates the active variant, active product, and selected active shade. It then selects the best active, non-deleted `paint_pricing_rules` row matching product and any supplied constraints:

- product variant
- shade
- colour family
- tone
- depth
- finish
- pack size

Rule specificity is scored in descending priority as:

- product variant: 32
- shade: 16
- colour family: 8
- tone or depth: 4
- finish: 2
- pack size: 1

Tie-breakers are `priority DESC`, then `updated_at DESC`.

The base is the non-negative, rounded value of:

```text
variant.base_price
or variant.selling_price_override
or product.selling_price
or 0
```

If no rule matches:

- with a selected shade, adjustment is zero;
- without a selected shade, the legacy variant `shade_extra_price` is used according to `adjustment_type` (`none`, `fixed`, or `percentage`).

If a rule has `override_price`, that becomes the final price. Otherwise the rule adjustment is applied as none, fixed, or percentage of the base price. All values are rounded to two decimals.

The client-side `src/lib/pricing-engine.ts` mirrors the arithmetic for display and local cart pricing, but cart validation and checkout call the RPC/server authority.

## 10. Price display and tax/GST ordering

On product detail, `calculatePricingLine` is called with quantity 1 and the product GST rate. The displayed paint price is the taxable line value before GST:

```text
(base price + shade adjustment) × quantity
```

The pricing engine also calculates GST as:

```text
taxable line value × gst rate / 100
```

The line total is taxable value plus GST.

In the current `0034` checkout function:

1. Resolve canonical unit price from `resolve_paint_configuration_price`.
2. Multiply by quantity for line taxable value.
3. Calculate GST on that line taxable value.
4. Accumulate subtotal, taxable amount, tax, and quantity.
5. Validate and apply the coupon to the accumulated subtotal.
6. Resolve shipping from taxable amount.
7. Calculate total as subtotal + shipping - coupon discount.

The exact checkout implementation should be treated as authoritative over any older migration version. Earlier migrations contain superseded pricing variants; `0034_selected_shade_pricing_authority.sql` is the final inspected authority migration.

## 11. Quantity handling

Product detail starts quantity at 1. Decrease clamps to 1; increase has no product-detail upper clamp.

`validateCartAddition` requires available stock and rejects requested quantity above available stock. It returns the quantity clamped to available stock in its normalized result, while the direct add path reports validation errors to the user.

The pricing engine normalizes quantity to at least 1 and floors it. Checkout multiplies canonical unit pricing by the persisted cart quantity and checks current inventory against `current_quantity - reserved_quantity`.

## 12. Cart persistence

`src/lib/cart-service.ts`, `addValidatedCartItem`, first validates the selected product, variant, shade, finish, inventory, and price. The persisted `cart_items` snapshot includes:

- `product_id`
- `product_variant_id`
- `shade_id`
- `shade_code_snapshot`
- `shade_name_snapshot`
- `colour_family_snapshot`
- `hex_color_snapshot`
- `pack_size_snapshot`
- `finish_snapshot`
- `base_price_snapshot`
- `shade_extra_price_snapshot`
- `final_unit_price_snapshot`
- `sku_snapshot`
- `quantity`

Local cart uniqueness uses product ID, variant ID, shade ID, pack size, and finish. Different paint configurations therefore remain separate cart lines.

When remote cart rows are loaded, `loadRemoteCartItems` resolves the associated product and variant and reconstructs the same configuration fields. It also re-resolves price using `resolve_paint_configuration_price`.

When local cart state is synchronized, `replaceRemoteCartItems` normalizes quantities and writes the same snapshot fields after resolving the selected variant and canonical pricing.

## 13. Add to Cart and Buy Now

`src/components/product/product-detail-page.tsx` uses the same configuration payload for both actions:

- `productId`
- resolved `variantId`
- selected/resolved `shadeId`
- shade code, name, family, sub-family, and hex colour
- pack size and unit
- finish
- display price, base price, shade adjustment, GST rate, final unit price
- product identity, image, SKU, stock, and variant summary

`handleAddToCart` calls `addValidatedCartItem`, flushes cart synchronization, and shows a success toast.

`handleBuyNow` calls the same validated add operation, flushes synchronization, and navigates to `/checkout`.

Authentication is required for both actions; unauthenticated users are redirected to login. Out-of-stock products disable the actions.

## 14. Checkout validation and order snapshots

Checkout revalidates the live product, variant, shade, compatibility mapping, inventory, and canonical price. It does not trust the product-detail display price or an old cart price snapshot.

The selected shade must exist in `shades` with `deleted_at IS NULL` and `is_active = true`. Its product mapping must exist in `product_shades` with `deleted_at IS NULL` and `is_available = true`. The mapping must either have no finish restriction or match the variant/cart finish case-insensitively.

The checkout line snapshot contains product, variant, shade, shade code/name, colour family, hex colour, pack size, finish, base price, shade adjustment, final unit price, SKU, quantity, GST, and total values.

The order creation RPC copies these values into `order_items`, including:

- `shade_id`
- `shade_code_snapshot`
- `shade_name_snapshot`
- `colour_family_snapshot`
- `hex_color_snapshot`
- `pack_size_snapshot`
- `finish_snapshot`
- `base_price_snapshot`
- `shade_extra_price_snapshot`
- `final_unit_price_snapshot`
- `sku_snapshot`

This preserves the selected paint configuration even if catalogue display data later changes.

## 15. No-shade products

Non-paint products use the generic variant-group UI in `product-detail-page.tsx`. They do not use the paint configuration picker.

If a product has no shade variants, the product detail page falls back to normal variant groups and ordinary product pricing. A cart item may have null shade fields.

The database checkout path still resolves the selected/default variant and only validates a shade when the variant/cart selection has a shade ID.

## 16. Invalid, inactive, deleted, and unavailable data

- Products require active status and null `deleted_at`.
- Variants require null `deleted_at`; purchasing additionally requires `is_active = true` and `is_available !== false`.
- Shades require `is_active = true` and null `deleted_at`.
- Product-shade mappings require `is_available = true` and null `deleted_at`.
- Inventory rows require null `deleted_at`.
- A deleted/inactive shade is rejected by cart validation and pricing RPC.
- A missing/inactive product-shade mapping is rejected as incompatible.
- A missing or unavailable variant is rejected.
- A stock shortfall is rejected during cart validation or checkout.
- Shade API failures return an error response; the picker displays an error or an empty/no-shades state.

## 17. Important edge cases

- A null `product_shades.finish` is a finish wildcard.
- Finish comparisons are case-insensitive and trim whitespace.
- Family grouping is case-insensitive, but the first normalized display spelling is retained.
- Shade IDs are deduplicated before API filtering and pagination.
- A selected shade with no matching pricing rule receives zero shade adjustment; the legacy variant surcharge is not used for that selected shade.
- A variant with no shade can act as a fallback for display resolution, but strict cart validation still requires a purchasable variant combination.
- If a selected shade becomes unavailable between product detail and cart/checkout, the server rejects it rather than silently purchasing another shade.
- If the selected finish changes, the picker clears the shade because the previous shade may not be compatible with the new finish.
- The shade preview includes a disclaimer that displayed colour can vary with lighting, surface, and screen.

## 18. Android implementation implications

The web’s effective configuration identity is not only product ID. It is the combination of:

```text
product_id + product_variant_id + shade_id + pack_size + finish
```

The Android implementation must preserve that identity if it is to match web cart behavior. Display labels and inferred colour values are insufficient substitutes for the IDs and server-validated compatibility rules.

The web reference does not require a separate finish table. Finish is a variant/mapping text attribute. Colour family is derived from compatible shade rows. Shade selection is an ID selection, not merely a label or hex-colour selection. Price must be resolved from the selected variant and selected shade through `resolve_paint_configuration_price`.

WEB SHADE REFERENCE COMPLETE
