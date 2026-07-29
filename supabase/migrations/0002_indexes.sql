create unique index if not exists idx_profiles_email_active
  on public.profiles (email)
  where deleted_at is null;

create unique index if not exists idx_profiles_phone_active
  on public.profiles (phone)
  where phone is not null and deleted_at is null;

create unique index if not exists idx_profiles_customer_code_active
  on public.profiles (customer_code)
  where deleted_at is null;

create index if not exists idx_profiles_role_id on public.profiles (role_id);
create index if not exists idx_profiles_status on public.profiles (status);

create unique index if not exists idx_roles_key on public.roles (key);

create index if not exists idx_profile_roles_profile_id on public.profile_roles (profile_id);
create index if not exists idx_profile_roles_role_id on public.profile_roles (role_id);

create unique index if not exists idx_departments_slug_active
  on public.departments (slug)
  where deleted_at is null;

create index if not exists idx_departments_status on public.departments (is_active);
create index if not exists idx_departments_sort_order on public.departments (sort_order);

create unique index if not exists idx_categories_slug_active
  on public.categories (slug)
  where deleted_at is null;

create index if not exists idx_categories_department_id on public.categories (department_id);
create index if not exists idx_categories_status on public.categories (is_active);
create index if not exists idx_categories_sort_order on public.categories (sort_order);

create unique index if not exists idx_brands_slug_active
  on public.brands (slug)
  where deleted_at is null;

create index if not exists idx_brands_department_id on public.brands (department_id);
create index if not exists idx_brands_category_id on public.brands (category_id);
create index if not exists idx_brands_status on public.brands (is_active);

create unique index if not exists idx_products_slug_active
  on public.products (slug)
  where deleted_at is null;

create unique index if not exists idx_products_sku_active
  on public.products (sku)
  where deleted_at is null;

create index if not exists idx_products_brand_id on public.products (brand_id);
create index if not exists idx_products_category_id on public.products (category_id);
create index if not exists idx_products_department_id on public.products (department_id);
create index if not exists idx_products_status on public.products (status);
create index if not exists idx_products_featured on public.products (featured);

create index if not exists idx_product_images_product_id on public.product_images (product_id);
create index if not exists idx_product_images_sort_order on public.product_images (sort_order);
create index if not exists idx_product_images_primary on public.product_images (product_id, is_primary);

create unique index if not exists idx_product_variants_sku_active
  on public.product_variants (sku)
  where deleted_at is null;

create index if not exists idx_product_variants_product_id on public.product_variants (product_id);
create index if not exists idx_product_variants_status on public.product_variants (is_active);
create index if not exists idx_product_variants_default on public.product_variants (product_id, is_default);

create unique index if not exists idx_inventory_variant_id on public.inventory (product_variant_id);
create index if not exists idx_inventory_status on public.inventory (stock_status);
create index if not exists idx_inventory_low_stock_threshold on public.inventory (low_stock_threshold);

create index if not exists idx_addresses_user_id on public.addresses (user_id);
create index if not exists idx_addresses_status on public.addresses (is_default);
create unique index if not exists idx_addresses_default_per_user
  on public.addresses (user_id)
  where is_default and deleted_at is null;

create index if not exists idx_cart_items_user_id on public.cart_items (user_id);
create index if not exists idx_cart_items_product_id on public.cart_items (product_id);
create index if not exists idx_cart_items_variant_id on public.cart_items (product_variant_id);
create unique index if not exists idx_cart_items_unique_active
  on public.cart_items (user_id, product_id, coalesce(product_variant_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where deleted_at is null;

create index if not exists idx_wishlist_items_user_id on public.wishlist_items (user_id);
create index if not exists idx_wishlist_items_product_id on public.wishlist_items (product_id);
create index if not exists idx_wishlist_items_variant_id on public.wishlist_items (product_variant_id);
create unique index if not exists idx_wishlist_items_unique_active
  on public.wishlist_items (user_id, product_id, coalesce(product_variant_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where deleted_at is null;

create unique index if not exists idx_coupons_code_active
  on public.coupons (code)
  where deleted_at is null;

create index if not exists idx_coupons_status on public.coupons (status);
create index if not exists idx_coupons_expiry_at on public.coupons (expiry_at);

create unique index if not exists idx_orders_order_number on public.orders (order_number);
create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_payment_status on public.orders (payment_status);
create index if not exists idx_orders_coupon_id on public.orders (coupon_id);
create index if not exists idx_orders_placed_at on public.orders (placed_at);

create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_order_items_product_id on public.order_items (product_id);
create index if not exists idx_order_items_variant_id on public.order_items (product_variant_id);

create index if not exists idx_reviews_user_id on public.reviews (user_id);
create index if not exists idx_reviews_product_id on public.reviews (product_id);
create index if not exists idx_reviews_status on public.reviews (status);
create unique index if not exists idx_reviews_unique_active
  on public.reviews (user_id, product_id)
  where deleted_at is null;

create index if not exists idx_coupon_usage_coupon_id on public.coupon_usage (coupon_id);
create index if not exists idx_coupon_usage_user_id on public.coupon_usage (user_id);
create index if not exists idx_coupon_usage_order_id on public.coupon_usage (order_id);

create index if not exists idx_notifications_user_id on public.notifications (user_id);
create index if not exists idx_notifications_is_read on public.notifications (is_read);
create index if not exists idx_notifications_type on public.notifications (type);
create index if not exists idx_notifications_created_at on public.notifications (created_at);

create unique index if not exists idx_banners_slug_active
  on public.banners (slug)
  where deleted_at is null;

create index if not exists idx_banners_placement on public.banners (placement);
create index if not exists idx_banners_status on public.banners (is_active);
create index if not exists idx_banners_sort_order on public.banners (sort_order);

create unique index if not exists idx_support_tickets_ticket_number on public.support_tickets (ticket_number);
create index if not exists idx_support_tickets_user_id on public.support_tickets (user_id);
create index if not exists idx_support_tickets_status on public.support_tickets (status);
create index if not exists idx_support_tickets_priority on public.support_tickets (priority);
create index if not exists idx_support_tickets_order_id on public.support_tickets (order_id);

create index if not exists idx_support_ticket_replies_ticket_id on public.support_ticket_replies (ticket_id);
create index if not exists idx_support_ticket_replies_user_id on public.support_ticket_replies (user_id);

create index if not exists idx_paint_calculations_user_id on public.paint_calculations (user_id);
create index if not exists idx_paint_calculations_created_at on public.paint_calculations (created_at);

create index if not exists idx_room_visualizations_user_id on public.room_visualizations (user_id);
create index if not exists idx_room_visualizations_brand_id on public.room_visualizations (brand_id);
create index if not exists idx_room_visualizations_created_at on public.room_visualizations (created_at);

create unique index if not exists idx_settings_scope_key on public.settings (scope, key);
create index if not exists idx_settings_is_public on public.settings (is_public);
create index if not exists idx_settings_key on public.settings (key);
