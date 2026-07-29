# UniqueShopee Supabase Schema

This folder contains the production database design for UniqueShopee.

## Migration Order

1. `0001_initial_schema.sql`
2. `0002_indexes.sql`
3. `0003_rls.sql`
4. `0004_storage.sql`

## Core Tables

### Identity and Access

- `roles` stores the platform role catalog for future expansion.
- `profiles` maps Supabase auth users to app-level customer/admin metadata.
- `profile_roles` supports multiple roles per profile without changing the schema later.

### Catalog

- `departments` is the top-level product grouping.
- `categories` belongs to a department.
- `brands` belongs to a department and can optionally be associated with a category.
- `products` belongs to a department, category, and brand.
- `product_images` stores gallery and hero images for products.
- `product_variants` stores option-based product variations.
- `inventory` stores stock state for each variant.

### Customer Commerce

- `cart_items` stores active cart lines for a profile.
- `wishlist_items` stores saved products for a profile.
- `orders` stores the order header and financial summary.
- `order_items` stores the line items for each order.
- `reviews` stores product feedback and moderation state.

### Promotions and Engagement

- `coupons` stores discount rules and validity windows.
- `coupon_usage` stores redemption history.
- `notifications` stores customer-facing in-app notifications.
- `banners` stores marketing placements for the storefront.

### Support and Tools

- `support_tickets` stores customer support cases.
- `support_ticket_replies` stores the conversation timeline for each ticket.
- `paint_calculations` stores paint estimator sessions and saved estimates.
- `room_visualizations` stores room preview sessions and generated design metadata.

### Configuration

- `settings` stores app-wide or scoped configuration values in JSON.

## Relationships

### Catalog Hierarchy

`departments -> categories -> brands -> products -> product_variants -> inventory`

### Customer Flow

`profiles -> cart_items`

`profiles -> wishlist_items`

`profiles -> orders -> order_items`

`profiles -> reviews`

`profiles -> addresses`

`profiles -> paint_calculations`

`profiles -> room_visualizations`

### Support Flow

`profiles -> support_tickets -> support_ticket_replies`

### Promotion Flow

`coupons -> coupon_usage -> orders`

## Data Protection

Row level security is enabled in `0003_rls.sql`.

Customers can only access their own:

- `cart_items`
- `wishlist_items`
- `orders`
- `addresses`
- `reviews`
- `paint_calculations`
- `room_visualizations`
- `notifications`
- `support_tickets`
- `support_ticket_replies`
- `coupon_usage`

Admins, managers, and staff can manage everything through the shared admin policies.

## Index Strategy

`0002_indexes.sql` adds indexes for:

- `slug`
- `email`
- `phone`
- `SKU`
- `brand_id`
- `category_id`
- `department_id`
- `order_id`
- `user_id`
- `status`

It also adds supporting indexes for common ownership, search, and sorting paths.

## Storage Buckets

`0004_storage.sql` creates these buckets:

- `products`
- `brands`
- `categories`
- `users`
- `banners`
- `documents`
- `room-visualizer`
- `support`

Public buckets are configured for storefront assets. Private buckets are reserved for user-generated or operational files.

## Future Scalability

This schema is ready for later frontend integration without structural changes:

- Supabase Auth can connect directly to `profiles`
- Admin roles can expand through `roles` and `profile_roles`
- Product media can move into `storage.objects`
- Orders can later feed checkout and fulfillment flows
- Support tickets already have a conversation model
- Paint tools and room visualization tools already have persistence tables
- Settings can support feature flags, branding, shipping, tax, and integrations

## Frontend Integration Later

The frontend can connect later through:

- SSR clients in `src/lib/supabase`
- authenticated session helpers
- storage upload helpers
- database query helpers

No frontend routes, mock data, or Zustand stores need to change to adopt this schema.
