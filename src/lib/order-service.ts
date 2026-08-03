import type { SupabaseClient } from "@supabase/supabase-js";
import { getQaCheckoutPricingSummary, QA_ORDERS, isQaBypassEnabled } from "@/lib/qa-mode";
import {
  ORDER_STATUS_DB_VALUES,
  getOrderById as getMockOrderById,
  getOrders as getMockOrders,
  type OrderItem,
  type OrderMutableStatus,
  type OrderRecord,
  type OrderStatus,
  type OrderTimelineStep,
} from "@/lib/orders-data";

export type OrderAccessRole = "customer" | "admin" | "manager" | "staff";

type AddressSnapshot = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
};

type OrderRow = {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  payment_reference: string | null;
  coupon_id: string | null;
  shipping_address_id: string | null;
  billing_address_id: string | null;
  shipping_address_snapshot: unknown;
  billing_address_snapshot: unknown;
  subtotal: number | string;
  discount_total: number | string;
  shipping_total: number | string;
  tax_total: number | string;
  total_amount: number | string;
  notes: string | null;
  tracking_number: string | null;
  placed_at: string;
  confirmed_at: string | null;
  packed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  returned_at: string | null;
  refunded_at: string | null;
  deleted_at: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_variant_id: string | null;
  sku_snapshot: string | null;
  product_name_snapshot: string;
  quantity: number | string;
  unit_price: number | string;
  discount_amount: number | string;
  gst_rate: number | string;
  total_amount: number | string;
  deleted_at: string | null;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  mrp: number | string;
  og_image_url: string | null;
  category_id: string;
  brand_id: string;
  attributes: Record<string, unknown> | null;
  deleted_at: string | null;
  status: string;
};

type BrandRow = {
  id: string;
  name: string;
  deleted_at: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  deleted_at: string | null;
};

type VariantRow = {
  id: string;
  product_id: string;
  sku: string;
  variant_name: string;
  option_label: string | null;
  option_value: string | null;
  is_default: boolean;
  deleted_at: string | null;
};

type ProductImageRow = {
  product_id: string;
  image_url: string;
  sort_order: number;
  is_primary: boolean;
  deleted_at: string | null;
};

type CouponUsageRow = {
  order_id: string;
  discount_amount: number | string;
  coupon_id: string | null;
  deleted_at: string | null;
};

type CouponRow = {
  id: string;
  code: string;
  deleted_at: string | null;
};

type CheckoutOrderResult = {
  order_id: string;
  order_number: string;
};

type CheckoutPricingRow = {
  coupon_id: string | null;
  coupon_code: string | null;
  subtotal: number | string;
  discount_total: number | string;
  coupon_discount: number | string;
  taxable_amount: number | string;
  tax_total: number | string;
  shipping_total: number | string;
  total_amount: number | string;
  item_count: number | string;
  line_items: unknown;
};

export type CheckoutPricingSummary = {
  couponId: string | null;
  couponCode: string | null;
  subtotal: number;
  discountTotal: number;
  couponDiscount: number;
  taxableAmount: number;
  taxTotal: number;
  shippingTotal: number;
  totalAmount: number;
  itemCount: number;
};

type CheckoutOrderPayload = {
  shippingAddressId?: string | null;
  billingAddressId?: string | null;
  paymentMethod: string;
  paymentReference?: string | null;
  paymentStatus?: string | null;
  couponCode?: string | null;
  notes?: string | null;
  shippingAddressSnapshot?: AddressSnapshot | null;
  billingAddressSnapshot?: AddressSnapshot | null;
};

type UpdateOrderStatusResult = {
  error: string | null;
};

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function mapStatus(status: string | null | undefined): OrderStatus {
  switch ((status ?? "").toLowerCase()) {
    case "ordered":
      return "Ordered";
    case "confirmed":
      return "Confirmed";
    case "packed":
      return "Packed";
    case "shipped":
      return "Shipped";
    case "out for delivery":
    case "out_for_delivery":
      return "Out for Delivery";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    case "returned":
      return "Returned";
    case "refunded":
      return "Refunded";
    case "pending":
    default:
      return "Pending";
  }
}

function isPrivilegedOrderRole(roleKey?: OrderAccessRole | null) {
  return Boolean(roleKey && roleKey !== "customer");
}

function readSnapshot(snapshot: unknown): AddressSnapshot {
  const value = (snapshot ?? {}) as Record<string, unknown>;
  const line2Parts = [value.line2, value.landmark, value.area]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .map((part) => part as string);

  return {
    name: asText(value.full_name ?? value.name),
    line1: asText(value.line1),
    line2: line2Parts.join(", "),
    city: asText(value.city),
    state: asText(value.state),
    pincode: asText(value.pin_code ?? value.pincode ?? value.pin),
    phone: asText(value.phone),
  };
}

function buildTimeline(order: OrderRow): OrderTimelineStep[] {
  const status = mapStatus(order.status);
  const active = new Set<OrderTimelineStep["status"]>(["Pending"]);

  if (status !== "Pending") {
    active.add("Ordered");
  }
  if (["Confirmed", "Packed", "Shipped", "Delivered"].includes(status)) {
    active.add("Confirmed");
  }
  if (["Packed", "Shipped", "Delivered"].includes(status)) {
    active.add("Packed");
  }
  if (["Shipped", "Delivered"].includes(status)) {
    active.add("Shipped");
    active.add("Out for Delivery");
  }
  if (status === "Delivered") {
    active.add("Delivered");
  }

  return [
    {
      status: "Pending",
      timestamp: formatTimestamp(order.placed_at),
      description: "We received your order and are preparing to process it.",
      icon: "pending",
      active: active.has("Pending"),
    },
    {
      status: "Ordered",
      timestamp: formatTimestamp(order.placed_at),
      description: "Your order was placed successfully.",
      icon: "ordered",
      active: active.has("Ordered"),
    },
    {
      status: "Confirmed",
      timestamp: formatTimestamp(order.confirmed_at),
      description: "We confirmed your order and began preparing it.",
      icon: "confirmed",
      active: active.has("Confirmed"),
    },
    {
      status: "Packed",
      timestamp: formatTimestamp(order.packed_at),
      description: "Your items were packed and quality checked.",
      icon: "packed",
      active: active.has("Packed"),
    },
    {
      status: "Shipped",
      timestamp: formatTimestamp(order.shipped_at),
      description: "Your package left the warehouse.",
      icon: "shipped",
      active: active.has("Shipped"),
    },
    {
      status: "Out for Delivery",
      timestamp: formatTimestamp(order.shipped_at ?? order.delivered_at),
      description: "The courier is on the way to your address.",
      icon: "delivery",
      active: active.has("Out for Delivery"),
    },
    {
      status: "Delivered",
      timestamp: formatTimestamp(order.delivered_at),
      description: status === "Delivered" ? "Delivered safely to your address." : "Awaiting delivery completion.",
      icon: "delivered",
      active: active.has("Delivered"),
    },
  ];
}

function firstImage(productId: string, images: ProductImageRow[]) {
  return (
    images.find((image) => image.product_id === productId && image.is_primary && image.deleted_at === null)?.image_url ??
    images
      .filter((image) => image.product_id === productId && image.deleted_at === null)
      .sort((left, right) => left.sort_order - right.sort_order)[0]?.image_url ??
    ""
  );
}

function buildOrderItem(
  item: OrderItemRow,
  product: ProductRow | undefined,
  brandName: string,
  categoryName: string,
  variant: VariantRow | undefined,
  images: ProductImageRow[],
): OrderItem {
  const price = toNumber(item.unit_price);
  const compareAtPrice = product && toNumber(product.mrp) > price ? toNumber(product.mrp) : undefined;
  const attributes = product?.attributes ?? null;
  const variantLabel =
    [variant?.variant_name, variant?.option_label && variant?.option_value ? `${variant.option_label}: ${variant.option_value}` : null]
      .filter(Boolean)
      .join(" • ") ||
    variant?.sku ||
    item.sku_snapshot ||
    "Standard";

  return {
    id: item.id,
    name: item.product_name_snapshot,
    slug: product?.slug ?? item.product_id,
    productId: item.product_id,
    returnable: toBoolean(attributes?.returnable ?? attributes?.is_returnable ?? attributes?.returnable_product, false),
    price,
    compareAtPrice,
    image: firstImage(item.product_id, images) || product?.og_image_url || "/images/placeholders/department-plumbing.svg",
    category: categoryName,
    badge: undefined,
    brand: brandName,
    quantity: toNumber(item.quantity, 1),
    variant: variantLabel,
  };
}

function toOrderRecord(
  order: OrderRow,
  items: OrderItem[],
  couponCode: string | null,
  couponDiscount: number,
): OrderRecord {
  const deliveryAddress = readSnapshot(order.shipping_address_snapshot);
  const billingAddress = readSnapshot(order.billing_address_snapshot);

  return {
    id: order.id,
    orderNumber: order.order_number,
    status: mapStatus(order.status),
    paymentStatus: (order.payment_status ?? "pending") as OrderRecord["paymentStatus"],
    placedAt: formatTimestamp(order.placed_at),
    placedAtRaw: order.placed_at,
    deliveredAt: order.delivered_at ? formatTimestamp(order.delivered_at) : undefined,
    deliveredAtRaw: order.delivered_at,
    trackingNumber: order.tracking_number ?? undefined,
    paymentMethod: order.payment_method ?? "Pending",
    paymentReference: order.payment_reference ?? "pending",
    deliveryAddress,
    billingAddress,
    couponApplied: couponCode ?? undefined,
    notes: order.notes ?? undefined,
    subtotal: toNumber(order.subtotal),
    discount: toNumber(order.discount_total),
    couponDiscount,
    gst: toNumber(order.tax_total),
    shipping: toNumber(order.shipping_total),
    grandTotal: toNumber(order.total_amount),
    itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
    timeline: buildTimeline(order),
  };
}

async function loadOrderBundle(client: SupabaseClient, orders: OrderRow[]) {
  if (orders.length === 0) {
    return [] as OrderRecord[];
  }

  const orderIds = orders.map((order) => order.id);

  const { data: itemsData, error: itemsError } = await client
    .from("order_items")
    .select("id, order_id, product_id, product_variant_id, sku_snapshot, product_name_snapshot, quantity, unit_price, discount_amount, gst_rate, total_amount, deleted_at")
    .in("order_id", orderIds)
    .is("deleted_at", null);

  if (itemsError) {
    return [] as OrderRecord[];
  }

  const orderItems = (itemsData ?? []) as OrderItemRow[];
  const productIds = Array.from(new Set(orderItems.map((item) => item.product_id)));
  const variantIds = Array.from(
    new Set(orderItems.map((item) => item.product_variant_id).filter((value): value is string => Boolean(value))),
  );

  const { data: productsData } =
    productIds.length > 0
      ? await client
          .from("products")
          .select("id, slug, name, mrp, og_image_url, category_id, brand_id, attributes, deleted_at, status")
          .in("id", productIds)
          .is("deleted_at", null)
      : { data: [] as ProductRow[] };

  const products = (productsData ?? []) as ProductRow[];
  const brandIds = Array.from(new Set(products.map((product) => product.brand_id)));
  const categoryIds = Array.from(new Set(products.map((product) => product.category_id)));

  const [
    { data: brandsData },
    { data: categoriesData },
    { data: variantsData },
    { data: imagesData },
    { data: couponUsageData },
    { data: couponsData },
  ] = await Promise.all([
    brandIds.length > 0
      ? client.from("brands").select("id, name, deleted_at").in("id", brandIds).is("deleted_at", null)
      : Promise.resolve({ data: [] as BrandRow[] }),
    categoryIds.length > 0
      ? client.from("categories").select("id, name, deleted_at").in("id", categoryIds).is("deleted_at", null)
      : Promise.resolve({ data: [] as CategoryRow[] }),
    variantIds.length > 0
      ? client
          .from("product_variants")
          .select("id, product_id, sku, variant_name, option_label, option_value, is_default, deleted_at")
          .in("id", variantIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as VariantRow[] }),
    productIds.length > 0
      ? client
          .from("product_images")
          .select("product_id, image_url, sort_order, is_primary, deleted_at")
          .in("product_id", productIds)
          .is("deleted_at", null)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] as ProductImageRow[] }),
    client.from("coupon_usage").select("order_id, discount_amount, coupon_id, deleted_at").in("order_id", orderIds).is("deleted_at", null),
    (() => {
      const couponIds = orders.map((order) => order.coupon_id).filter((value): value is string => Boolean(value));
      return couponIds.length > 0
        ? client.from("coupons").select("id, code, deleted_at").in("id", couponIds).is("deleted_at", null)
        : Promise.resolve({ data: [] as CouponRow[] });
    })(),
  ]);

  const brands = new Map(((brandsData ?? []) as BrandRow[]).map((row) => [row.id, row.name]));
  const categories = new Map(((categoriesData ?? []) as CategoryRow[]).map((row) => [row.id, row.name]));
  const variants = new Map(((variantsData ?? []) as VariantRow[]).map((row) => [row.id, row]));
  const images = (imagesData ?? []) as ProductImageRow[];
  const couponUsage = new Map(((couponUsageData ?? []) as CouponUsageRow[]).map((row) => [row.order_id, row]));
  const coupons = new Map(((couponsData ?? []) as CouponRow[]).map((row) => [row.id, row.code]));
  const productsById = new Map(products.map((row) => [row.id, row]));

  return orders.map((order) => {
    const items = orderItems
      .filter((item) => item.order_id === order.id)
      .map((item) => {
        const product = productsById.get(item.product_id);
        const brandName = product ? brands.get(product.brand_id) ?? "Brand" : "Brand";
        const categoryName = product ? categories.get(product.category_id) ?? "Category" : "Category";
        const variant = item.product_variant_id ? variants.get(item.product_variant_id) : undefined;
        return buildOrderItem(item, product, brandName, categoryName, variant, images);
      });

    const couponUsageRow = couponUsage.get(order.id) ?? null;
    const couponCode = couponUsageRow?.coupon_id ? coupons.get(couponUsageRow.coupon_id) ?? null : null;
    const couponDiscount = toNumber(couponUsageRow?.discount_amount, 0);

    return toOrderRecord(order, items, couponCode, couponDiscount);
  });
}

export async function loadOrdersForViewer(
  client: SupabaseClient | null,
  userId: string | null,
  options?: { roleKey?: OrderAccessRole | null },
) {
  if (isQaBypassEnabled()) {
    return QA_ORDERS;
  }

  if (!client) {
    return getMockOrders();
  }

  const isPrivileged = options?.roleKey ? options.roleKey !== "customer" : false;
  if (!isPrivileged && !userId) {
    return [] as OrderRecord[];
  }

  let query = client
    .from("orders")
    .select("id, user_id, order_number, status, payment_status, payment_method, payment_reference, coupon_id, shipping_address_id, billing_address_id, shipping_address_snapshot, billing_address_snapshot, subtotal, discount_total, shipping_total, tax_total, total_amount, notes, tracking_number, placed_at, confirmed_at, packed_at, shipped_at, delivered_at, cancelled_at, returned_at, refunded_at, deleted_at")
    .is("deleted_at", null)
    .order("placed_at", { ascending: false });

  if (!isPrivileged && userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [] as OrderRecord[];
  }

  return loadOrderBundle(client, data as OrderRow[]);
}

export async function loadOrderById(
  client: SupabaseClient | null,
  orderId: string,
  userId: string | null,
  options?: { roleKey?: OrderAccessRole | null },
) {
  if (isQaBypassEnabled()) {
    return QA_ORDERS.find((order) => order.id === orderId || order.orderNumber === orderId) ?? getMockOrderById(orderId) ?? null;
  }

  if (!client) {
    return getMockOrderById(orderId) ?? null;
  }

  const isPrivileged = options?.roleKey ? options.roleKey !== "customer" : false;
  if (!isPrivileged && !userId) {
    return null;
  }

  let query = client
    .from("orders")
    .select("id, user_id, order_number, status, payment_status, payment_method, payment_reference, coupon_id, shipping_address_id, billing_address_id, shipping_address_snapshot, billing_address_snapshot, subtotal, discount_total, shipping_total, tax_total, total_amount, notes, tracking_number, placed_at, confirmed_at, packed_at, shipped_at, delivered_at, cancelled_at, returned_at, refunded_at, deleted_at")
    .eq("id", orderId)
    .is("deleted_at", null);

  if (!isPrivileged && userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) {
    return null;
  }

  const [record] = await loadOrderBundle(client, [data as OrderRow]);
  return record ?? null;
}

export async function loadCheckoutPricing(
  client: SupabaseClient | null,
  options?: { couponCode?: string | null },
) {
  if (isQaBypassEnabled()) {
    return getQaCheckoutPricingSummary(options?.couponCode);
  }

  if (!client) {
    return { error: "Supabase is not configured.", pricing: null as CheckoutPricingSummary | null };
  }

  const { data, error } = await client.rpc("calculate_checkout_pricing", {
    p_coupon_code: options?.couponCode ?? null,
  });

  if (error) {
    return { error: error.message, pricing: null as CheckoutPricingSummary | null };
  }

  const result = Array.isArray(data) ? (data[0] as CheckoutPricingRow | undefined) : (data as CheckoutPricingRow | null);
  if (!result) {
    return { error: "Unable to calculate checkout pricing.", pricing: null as CheckoutPricingSummary | null };
  }

  return {
    error: null,
    pricing: {
      couponId: result.coupon_id ?? null,
      couponCode: result.coupon_code ?? null,
      subtotal: toNumber(result.subtotal),
      discountTotal: toNumber(result.discount_total),
      couponDiscount: toNumber(result.coupon_discount),
      taxableAmount: toNumber(result.taxable_amount),
      taxTotal: toNumber(result.tax_total),
      shippingTotal: toNumber(result.shipping_total),
      totalAmount: toNumber(result.total_amount),
      itemCount: toNumber(result.item_count),
    } satisfies CheckoutPricingSummary,
  };
}

export async function createCheckoutOrder(client: SupabaseClient | null, payload: CheckoutOrderPayload) {
  if (isQaBypassEnabled()) {
    return {
      error: null,
      orderId: QA_ORDERS[0]?.id ?? "qa-order-new",
      orderNumber: QA_ORDERS[0]?.orderNumber ?? "US202600099",
    };
  }

  if (!client) {
    return { error: "Supabase is not configured." };
  }

  const { data, error } = await client.rpc("create_checkout_order", {
    p_shipping_address_id: payload.shippingAddressId ?? null,
    p_billing_address_id: payload.billingAddressId ?? null,
    p_payment_method: payload.paymentMethod,
    p_payment_reference: payload.paymentReference ?? null,
    p_payment_status: payload.paymentStatus ?? null,
    p_coupon_code: payload.couponCode ?? null,
    p_notes: payload.notes ?? null,
    p_shipping_address_snapshot: payload.shippingAddressSnapshot ?? null,
    p_billing_address_snapshot: payload.billingAddressSnapshot ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  const result = Array.isArray(data) ? (data[0] as CheckoutOrderResult | undefined) : (data as CheckoutOrderResult | null);
  if (!result?.order_id) {
    return { error: "Order creation failed." };
  }

  return { error: null, orderId: result.order_id, orderNumber: result.order_number };
}

export async function updateOrderStatus(
  client: SupabaseClient | null,
  orderId: string,
  status: OrderMutableStatus,
  options?: { roleKey?: OrderAccessRole | null },
): Promise<UpdateOrderStatusResult> {
  if (!client) {
    return { error: "Supabase is not configured." };
  }

  if (!isPrivilegedOrderRole(options?.roleKey)) {
    return { error: "Permission denied." };
  }

  const dbStatus = ORDER_STATUS_DB_VALUES[status];
  const { error } = await client
    .from("orders")
    .update({ status: dbStatus })
    .eq("id", orderId);

  return { error: error ? error.message : null };
}

export async function updateOrderTrackingNumber(
  client: SupabaseClient | null,
  orderId: string,
  trackingNumber: string | null,
  options?: { roleKey?: OrderAccessRole | null },
): Promise<UpdateOrderStatusResult> {
  if (!client) {
    return { error: "Supabase is not configured." };
  }

  if (!isPrivilegedOrderRole(options?.roleKey)) {
    return { error: "Permission denied." };
  }

  const nextTrackingNumber = typeof trackingNumber === "string" ? trackingNumber.trim() : "";
  const { error } = await client
    .from("orders")
    .update({ tracking_number: nextTrackingNumber.length > 0 ? nextTrackingNumber : null })
    .eq("id", orderId);

  return { error: error ? error.message : null };
}

export async function cancelOrder(
  client: SupabaseClient | null,
  orderId: string,
): Promise<{ error: string | null }> {
  if (!client) {
    return { error: "Supabase is not configured." };
  }

  const { data, error } = await client.rpc("cancel_order", {
    p_order_id: orderId,
  });

  if (error) {
    return { error: error.message };
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) {
    return { error: "Unable to cancel order." };
  }

  return { error: null };
}
