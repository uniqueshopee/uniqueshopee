import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/supabase/types";
import type { Database } from "@/lib/supabase/types";
import {
  getQaAdminBannerRows,
  getQaAdminConsultationRows,
  getQaAdminCouponRows,
  getQaAdminCustomerRows,
  getQaAdminDashboardData,
  getQaAdminOrderRows,
  getQaAdminReturnRows,
  getQaAdminReviewRows,
  getQaAdminSettingsRows,
  isQaBypassEnabled,
} from "@/lib/qa-mode";
import { loadAdminReturnRequests } from "@/lib/return-service";

export type AdminDashboardStat = {
  label: string;
  value: string;
  delta: string;
  note: string;
  tone: "accent" | "success" | "warning" | "neutral";
};

export type AdminDashboardOrder = {
  id: string;
  customer: string;
  status: string;
  amount: number;
  date: string;
};

export type AdminDashboardProduct = {
  name: string;
  sales: number;
  revenue: number;
};

export type AdminDashboardCategory = {
  name: string;
  sales: number;
  share: number;
};

export type AdminDashboardReview = {
  customer: string;
  product: string;
  rating: number;
  status: string;
};

export type AdminDashboardData = {
  stats: AdminDashboardStat[];
  recentOrders: AdminDashboardOrder[];
  topProducts: AdminDashboardProduct[];
  topCategories: AdminDashboardCategory[];
  recentReviews: AdminDashboardReview[];
};

export type AdminOrdersRow = {
  id: string;
  orderNumber: string;
  customer: string;
  status: string;
  paymentStatus: string;
  amount: number;
  placedAt: string;
  trackingNumber: string;
  items: Array<{
    productName: string;
    shadeName?: string;
    shadeCode?: string;
    shadeFamily?: string;
    shadeHexColor?: string;
    finish?: string;
    packSize?: string;
    sku?: string;
    basePrice?: number | null;
    shadeAdjustment?: number | null;
    unitPrice?: number;
    gstRate?: number;
    taxableValue?: number | null;
    gstAmount?: number | null;
    lineTotal?: number;
    quantity: number;
  }>;
};

export type AdminCustomerRow = {
  id: string;
  name: string;
  email: string;
  orders: number;
  joined: string;
  status: string;
};

export type AdminReviewRow = {
  id: string;
  product: string;
  customer: string;
  rating: number;
  status: string;
  comment: string;
  createdAt: string;
  kind?: "review" | "consultation";
};

export type AdminConsultationRow = {
  id: string;
  product: string;
  customer: string;
  phone: string;
  slot: string;
  notes: string;
  status: string;
  createdAt: string;
};

export type AdminReturnRow = {
  id: string;
  ticketNumber: string;
  orderId: string;
  orderNumber: string;
  customer: string;
  product: string;
  status: string;
  reason: string;
  pickupOption: string;
  pickupLocation: string;
  createdAt: string;
  deliveryChargeNote: string;
};

export type AdminCouponRow = {
  id: string;
  code: string;
  discount: string;
  status: string;
  expiry: string;
  minimumOrder: string;
  maximumDiscount: string;
  usageLimit: string;
  perUserLimit: string;
  title: string;
  description: string;
  couponType: string;
  value: number;
  appliesTo: string;
};

export type AdminBannerRow = {
  id: string;
  title: string;
  subtitle: string;
  placement: string;
  status: string;
  imageUrl: string;
  linkUrl: string;
};

export type AdminSettingRow = {
  id: string;
  key: string;
  value: string;
  description: string;
  isPublic: boolean;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function toNumber(value: unknown) {
  const next = typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
  return Number.isFinite(next) ? next : 0;
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function loadAdminDashboardData(client: SupabaseClient<Database>): Promise<AdminDashboardData> {
  if (isQaBypassEnabled()) {
    return getQaAdminDashboardData();
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalProductsResult,
    activeProductsResult,
    totalOrdersResult,
    pendingOrdersResult,
    totalCustomersResult,
    revenueResult,
    lowStockResult,
    todayOrdersResult,
    recentOrdersResult,
    reviewsResult,
    productsResult,
    categoriesResult,
    orderItemsResult,
  ] = await Promise.all([
    client.from("products").select("id", { count: "exact", head: true }).is("deleted_at", null),
    client.from("products").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "active"),
    client.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null),
    client.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "pending"),
    client.from("profiles").select("id", { count: "exact", head: true }).is("deleted_at", null),
    client.from("orders").select("total_amount").is("deleted_at", null),
    client.from("inventory").select("current_quantity, reserved_quantity, low_stock_threshold, deleted_at"),
    client.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", todayStart.toISOString()),
    client.from("orders").select("id, order_number, status, total_amount, placed_at, user_id").is("deleted_at", null).order("placed_at", { ascending: false }).limit(5),
    client.from("reviews").select("id, user_id, product_id, rating, status, created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
    client.from("products").select("id, name, category_id").is("deleted_at", null),
    client.from("categories").select("id, name").is("deleted_at", null),
    client.from("order_items").select("product_id, quantity, total_amount").is("deleted_at", null),
  ]);

  const totalRevenue = (revenueResult.data ?? []).reduce((sum, row) => sum + toNumber(row.total_amount), 0);
  const lowStockProducts = (lowStockResult.data ?? []).filter((row) => {
    const available = Math.max(toNumber(row.current_quantity) - toNumber(row.reserved_quantity), 0);
    return available <= toNumber(row.low_stock_threshold);
  }).length;

  const recentOrdersRows = (recentOrdersResult.data ?? []).map((order) => {
    const orderId = typeof order.id === "string" ? order.id : "";
    const userId = typeof order.user_id === "string" ? order.user_id : "";
    const orderNumber = typeof order.order_number === "string" ? order.order_number : "";

    return {
      id: orderNumber || orderId.slice(0, 8).toUpperCase() || "ORDER",
      customer: userId.slice(0, 8).toUpperCase() || "CUSTOMER",
      status: String(order.status ?? "pending"),
      amount: toNumber(order.total_amount),
      date: new Date(String(order.placed_at ?? new Date().toISOString())).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
    };
  });

  const customerIds = Array.from(new Set((recentOrdersResult.data ?? []).map((order) => order.user_id)));
  const [profilesResult, productMapResult, categoryMapResult] = await Promise.all([
    customerIds.length > 0
      ? client.from("profiles").select("id, full_name, email").in("id", customerIds)
      : Promise.resolve({ data: [], error: null }),
    Promise.resolve(productsResult),
    Promise.resolve(categoriesResult),
  ]);

  const profileById = new Map(
    ((profilesResult.data ?? []) as Array<{ id: string; full_name: string | null; email: string }>).map((profile) => [
      profile.id,
      profile.full_name?.trim() || profile.email,
    ]),
  );

  const recentOrders = recentOrdersRows.map((order, index) => ({
    ...order,
    customer: profileById.get(String((recentOrdersResult.data ?? [])[index]?.user_id ?? "")) ?? order.customer,
  }));

  const productById = new Map(
    ((productMapResult.data ?? []) as Array<{ id: string; name: string; category_id: string | null }>).map((product) => [
      product.id,
      product,
    ]),
  );
  const categoryById = new Map(
    ((categoryMapResult.data ?? []) as Array<{ id: string; name: string }>).map((category) => [category.id, category.name]),
  );

  const productSales = new Map<string, { sales: number; revenue: number }>();
  const categorySales = new Map<string, { sales: number; revenue: number }>();

  for (const item of (orderItemsResult.data ?? []) as Array<{ product_id: string; quantity: number | string; total_amount: number | string }>) {
    const product = productById.get(item.product_id);
    const sales = toNumber(item.quantity);
    const revenue = toNumber(item.total_amount);
    const existingProduct = productSales.get(product?.name ?? "Unknown product") ?? { sales: 0, revenue: 0 };
    productSales.set(product?.name ?? "Unknown product", {
      sales: existingProduct.sales + sales,
      revenue: existingProduct.revenue + revenue,
    });

    const categoryName = product?.category_id ? categoryById.get(product.category_id) ?? "Unassigned" : "Unassigned";
    const existingCategory = categorySales.get(categoryName) ?? { sales: 0, revenue: 0 };
    categorySales.set(categoryName, {
      sales: existingCategory.sales + sales,
      revenue: existingCategory.revenue + revenue,
    });
  }

  const topProducts = Array.from(productSales.entries())
    .sort((left, right) => right[1].revenue - left[1].revenue)
    .slice(0, 5)
    .map(([name, summary]) => ({
      name,
      sales: summary.sales,
      revenue: summary.revenue,
    }));

  const topCategories = Array.from(categorySales.entries())
    .sort((left, right) => right[1].revenue - left[1].revenue)
    .slice(0, 5)
    .map(([name, summary], index, list) => ({
      name,
      sales: summary.sales,
      share: list.length > 0 && totalRevenue > 0 ? Number(((summary.revenue / totalRevenue) * 100).toFixed(0)) : 0,
    }))
    .sort((left, right) => right.share - left.share);

  const reviewUserIds = Array.from(new Set((reviewsResult.data ?? []).map((review) => review.user_id)));
  const reviewProductIds = Array.from(new Set((reviewsResult.data ?? []).map((review) => review.product_id)));
  const [reviewProfilesResult, reviewProductsResult] = await Promise.all([
    reviewUserIds.length > 0
      ? client.from("profiles").select("id, full_name, email").in("id", reviewUserIds)
      : Promise.resolve({ data: [], error: null }),
    reviewProductIds.length > 0 ? client.from("products").select("id, name").in("id", reviewProductIds) : Promise.resolve({ data: [], error: null }),
  ]);

  const reviewProfileById = new Map(
    ((reviewProfilesResult.data ?? []) as Array<{ id: string; full_name: string | null; email: string }>).map((profile) => [
      profile.id,
      profile.full_name?.trim() || profile.email,
    ]),
  );
  const reviewProductById = new Map(
    ((reviewProductsResult.data ?? []) as Array<{ id: string; name: string }>).map((product) => [product.id, product.name]),
  );

  const recentReviews = (reviewsResult.data ?? []).map((review) => ({
    customer: reviewProfileById.get(String(review.user_id ?? "")) ?? String(review.user_id ?? "").slice(0, 8).toUpperCase(),
    product: reviewProductById.get(String(review.product_id ?? "")) ?? "Unknown product",
    rating: toNumber(review.rating),
    status: toTitleCase(String(review.status ?? "pending")),
  }));

  return {
    stats: [
      {
        label: "Total Products",
        value: String(totalProductsResult.count ?? 0),
        delta: `${totalProductsResult.count ?? 0} live`,
        note: "Supabase catalog",
        tone: "accent",
      },
      {
        label: "Total Orders",
        value: String(totalOrdersResult.count ?? 0),
        delta: `${pendingOrdersResult.count ?? 0} pending`,
        note: "Current order flow",
        tone: "success",
      },
      {
        label: "Total Customers",
        value: String(totalCustomersResult.count ?? 0),
        delta: `${todayOrdersResult.count ?? 0} today`,
        note: "Profiles in Supabase",
        tone: "neutral",
      },
      {
        label: "Revenue",
        value: formatCurrency(totalRevenue),
        delta: `${activeProductsResult.count ?? 0} active`,
        note: `${lowStockProducts} low stock`,
        tone: "warning",
      },
    ],
    recentOrders,
    topProducts: topProducts.map((item) => ({ ...item })),
    topCategories,
    recentReviews,
  };
}

export async function loadAdminOrdersRows(client: SupabaseClient<Database>, limit = 25) {
  if (isQaBypassEnabled()) {
    return getQaAdminOrderRows().slice(0, limit);
  }

  const [ordersResult, profilesResult] = await Promise.all([
    client
      .from("orders")
      .select("id, order_number, status, payment_status, total_amount, placed_at, user_id, tracking_number, deleted_at")
      .is("deleted_at", null)
      .order("placed_at", { ascending: false })
      .limit(limit),
    client.from("profiles").select("id, full_name, email").is("deleted_at", null),
  ]);

  const profileById = new Map(
    ((profilesResult.data ?? []) as Array<{ id: string; full_name: string | null; email: string }>).map((profile) => [
      profile.id,
      profile.full_name?.trim() || profile.email,
    ]),
  );

  const orderRows = (ordersResult.data ?? []) as Array<{
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    total_amount: number | string;
    placed_at: string;
    user_id: string;
    tracking_number: string | null;
  }>;
  const orderIds = orderRows.map((order) => order.id);
  const itemsResult = orderIds.length
    ? await client
        .from("order_items")
        .select("order_id, product_name_snapshot, quantity, product_variant_id, sku_snapshot, shade_id, shade_name_snapshot, shade_code_snapshot, colour_family_snapshot, hex_color_snapshot, base_name_snapshot, pack_size_snapshot, finish_snapshot, base_price_snapshot, shade_extra_price_snapshot, final_unit_price_snapshot, gst_rate, taxable_value_snapshot, gst_amount_snapshot, unit_price, total_amount")
        .in("order_id", orderIds)
        .is("deleted_at", null)
    : { data: [], error: null };

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  const rawOrderItems = (itemsResult.data ?? []) as Array<{
    order_id: string;
    product_name_snapshot: string;
    quantity: number | string;
    product_variant_id: string | null;
    sku_snapshot: string | null;
    shade_id: string | null;
    shade_name_snapshot: string | null;
    shade_code_snapshot: string | null;
    colour_family_snapshot: string | null;
    hex_color_snapshot: string | null;
    base_name_snapshot: string | null;
    pack_size_snapshot: string | null;
    finish_snapshot: string | null;
    base_price_snapshot: number | string | null;
    shade_extra_price_snapshot: number | string | null;
    final_unit_price_snapshot: number | string | null;
    gst_rate: number | string | null;
    taxable_value_snapshot: number | string | null;
    gst_amount_snapshot: number | string | null;
    unit_price: number | string;
    total_amount: number | string;
  }>;
  const itemsByOrderId = new Map<string, AdminOrdersRow["items"]>();
  rawOrderItems.forEach((item) => {
    const items = itemsByOrderId.get(item.order_id) ?? [];
    items.push({
      productName: item.product_name_snapshot,
      shadeName: item.shade_name_snapshot ?? undefined,
      shadeCode: item.shade_code_snapshot ?? undefined,
      shadeFamily: item.colour_family_snapshot ?? undefined,
      shadeHexColor: item.hex_color_snapshot ?? undefined,
      finish: item.finish_snapshot ?? undefined,
      packSize: item.pack_size_snapshot ?? undefined,
      sku: item.sku_snapshot ?? undefined,
      basePrice: item.base_price_snapshot === null ? null : toNumber(item.base_price_snapshot),
      shadeAdjustment: item.shade_extra_price_snapshot === null ? null : toNumber(item.shade_extra_price_snapshot),
      unitPrice: toNumber(item.unit_price),
      gstRate: toNumber(item.gst_rate),
      taxableValue: item.taxable_value_snapshot === null ? null : toNumber(item.taxable_value_snapshot),
      gstAmount: item.gst_amount_snapshot === null ? null : toNumber(item.gst_amount_snapshot),
      lineTotal: toNumber(item.total_amount),
      quantity: toNumber(item.quantity) || 1,
    });
    itemsByOrderId.set(item.order_id, items);
  });

  return orderRows.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    customer: profileById.get(order.user_id) ?? order.user_id.slice(0, 8).toUpperCase(),
    status: order.status,
    paymentStatus: order.payment_status,
    amount: toNumber(order.total_amount),
    placedAt: new Date(order.placed_at).toLocaleString("en-IN", { day: "numeric", month: "short" }),
    trackingNumber: order.tracking_number ?? "",
    items: itemsByOrderId.get(order.id) ?? [],
  })) satisfies AdminOrdersRow[];
}

export async function loadAdminCustomerRows(client: SupabaseClient<Database>, limit = 25) {
  if (isQaBypassEnabled()) {
    return getQaAdminCustomerRows().slice(0, limit);
  }

  const [profilesResult, ordersResult] = await Promise.all([
    client.from("profiles").select("id, full_name, email, status, created_at, deleted_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(limit),
    client.from("orders").select("id, user_id, deleted_at").is("deleted_at", null),
  ]);

  const orderCountByUser = new Map<string, number>();
  ((ordersResult.data ?? []) as Array<{ user_id: string }>).forEach((order) => {
    orderCountByUser.set(order.user_id, (orderCountByUser.get(order.user_id) ?? 0) + 1);
  });

  return ((profilesResult.data ?? []) as Array<{ id: string; full_name: string | null; email: string; status: string | null; created_at: string }>).map((profile) => ({
    id: profile.id,
    name: profile.full_name?.trim() || profile.email,
    email: profile.email,
    orders: orderCountByUser.get(profile.id) ?? 0,
    joined: new Date(profile.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    status: toTitleCase(profile.status ?? "active"),
  })) satisfies AdminCustomerRow[];
}

export async function loadAdminReviewRows(client: SupabaseClient<Database>, limit = 25) {
  if (isQaBypassEnabled()) {
    return [...getQaAdminReviewRows(), ...getQaAdminConsultationRows().map((row) => ({
      id: row.id,
      product: row.product,
      customer: row.customer,
      rating: 5,
      status: row.status,
      comment: [
        "CONSULTATION_REQUEST",
        `Product: ${row.product}`,
        `Name: ${row.customer}`,
        `Phone: ${row.phone}`,
        `Preferred slot: ${row.slot}`,
        `Notes: ${row.notes || "None"}`,
      ].join("\n"),
      createdAt: row.createdAt,
      kind: "consultation" as const,
    }))].slice(0, limit);
  }

  const [reviewsResult, consultationsResult, profilesResult, productsResult] = await Promise.all([
    client.from("reviews").select("id, user_id, product_id, rating, status, comment, created_at, deleted_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(limit),
    client.from("consultations").select("id, user_id, product_id, full_name, phone, preferred_slot, notes, status, created_at, deleted_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(limit),
    client.from("profiles").select("id, full_name, email").is("deleted_at", null),
    client.from("products").select("id, name").is("deleted_at", null),
  ]);

  const profileById = new Map(
    ((profilesResult.data ?? []) as Array<{ id: string; full_name: string | null; email: string }>).map((profile) => [
      profile.id,
      profile.full_name?.trim() || profile.email,
    ]),
  );
  const productById = new Map(((productsResult.data ?? []) as Array<{ id: string; name: string }>).map((product) => [product.id, product.name]));

  const reviewRows = ((reviewsResult.data ?? []) as Array<{
    id: string;
    user_id: string;
    product_id: string;
    rating: number | string;
    status: string;
    comment: string | null;
    created_at: string;
  }>).map((review) => ({
    kind: "review" as const,
    id: review.id,
    product: productById.get(review.product_id) ?? "Unknown product",
    customer: profileById.get(review.user_id) ?? review.user_id.slice(0, 8).toUpperCase(),
    rating: toNumber(review.rating),
    status: toTitleCase(review.status),
    comment: review.comment ?? "",
    createdAt: new Date(review.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    createdAtIso: review.created_at,
  }));

  const consultationRows = ((consultationsResult.data ?? []) as Array<{
    id: string;
    user_id: string;
    product_id: string;
    full_name: string;
    phone: string;
    preferred_slot: string;
    notes: string | null;
    status: string;
    created_at: string;
  }>).map((consultation) => ({
    kind: "consultation" as const,
    id: consultation.id,
    product: productById.get(consultation.product_id) ?? "Unknown product",
    customer: consultation.full_name?.trim() || profileById.get(consultation.user_id) || consultation.user_id.slice(0, 8).toUpperCase(),
    rating: 5,
    status: toTitleCase(consultation.status),
    comment: [
      "CONSULTATION_REQUEST",
      `Product: ${productById.get(consultation.product_id) ?? "Unknown product"}`,
      `Name: ${consultation.full_name}`,
      `Phone: ${consultation.phone}`,
      `Preferred slot: ${consultation.preferred_slot}`,
      `Notes: ${consultation.notes?.trim() || "None"}`,
    ].join("\n"),
    createdAt: new Date(consultation.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    createdAtIso: consultation.created_at,
  }));

  return [...reviewRows, ...consultationRows]
    .sort((left, right) => new Date(right.createdAtIso).getTime() - new Date(left.createdAtIso).getTime())
    .map(({ createdAtIso: _createdAtIso, ...row }) => row satisfies AdminReviewRow);
}

export async function loadAdminReturnRows(client: SupabaseClient<Database>, limit = 25) {
  if (isQaBypassEnabled()) {
    return getQaAdminReturnRows().slice(0, limit) as AdminReturnRow[];
  }

  return ((await loadAdminReturnRequests(client, limit)) as Array<{
    id: string;
    ticketNumber: string;
    orderId: string;
    orderNumber: string;
    customer: string;
    productName: string;
    status: string;
    reason: string;
    pickupOption: string;
    pickupLocation: string;
    createdAt: string;
    deliveryChargeNote: string;
  }>).map((row) => ({
    id: row.id,
    ticketNumber: row.ticketNumber,
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    customer: row.customer,
    product: row.productName,
    status: row.status,
    reason: row.reason,
    pickupOption: row.pickupOption,
    pickupLocation: row.pickupLocation,
    createdAt: row.createdAt,
    deliveryChargeNote: row.deliveryChargeNote,
  })) satisfies AdminReturnRow[];
}

export async function loadAdminCouponRows(client: SupabaseClient<Database>, limit = 50) {
  if (isQaBypassEnabled()) {
    return getQaAdminCouponRows().slice(0, limit);
  }

  const { data } = await client
    .from("coupons")
    .select("id, code, title, description, coupon_type, value, minimum_order, maximum_discount, usage_limit, per_user_limit, start_at, expiry_at, status, applies_to, deleted_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as Array<{
    id: string;
    code: string;
    title: string;
    description: string | null;
    coupon_type: string;
    value: number | string;
    minimum_order: number | string;
    maximum_discount: number | string;
    usage_limit: number | null;
    per_user_limit: number;
    start_at: string | null;
    expiry_at: string | null;
    status: string;
    applies_to: Record<string, unknown> | null;
  }>).map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    title: coupon.title,
    description: coupon.description?.trim() || coupon.title,
    couponType: coupon.coupon_type,
    value: toNumber(coupon.value),
    discount: coupon.coupon_type === "percentage" ? `${toNumber(coupon.value)}% OFF` : `₹${toNumber(coupon.value)} OFF`,
    status: toTitleCase(coupon.status),
    expiry: coupon.expiry_at ? new Date(coupon.expiry_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "No expiry",
    minimumOrder: `₹${toNumber(coupon.minimum_order).toFixed(0)}`,
    maximumDiscount: coupon.maximum_discount && toNumber(coupon.maximum_discount) > 0 ? `₹${toNumber(coupon.maximum_discount).toFixed(0)}` : "Unlimited",
    usageLimit: coupon.usage_limit ? String(coupon.usage_limit) : "Unlimited",
    perUserLimit: String(coupon.per_user_limit),
    appliesTo: JSON.stringify(coupon.applies_to ?? {}),
  })) satisfies AdminCouponRow[];
}

export async function loadAdminBannerRows(client: SupabaseClient<Database>, limit = 25) {
  if (isQaBypassEnabled()) {
    return getQaAdminBannerRows().slice(0, limit);
  }

  const { data } = await client
    .from("banners")
    .select("id, slug, title, subtitle, placement, image_url, mobile_image_url, link_url, is_active, deleted_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as Array<{
    id: string;
    title: string;
    subtitle: string | null;
    placement: string;
    image_url: string;
    link_url: string | null;
    is_active: boolean;
  }>).map((banner) => ({
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle?.trim() || "",
    placement: banner.placement,
    status: banner.is_active ? "Active" : "Inactive",
    imageUrl: banner.image_url,
    linkUrl: banner.link_url ?? "",
  })) satisfies AdminBannerRow[];
}

export async function loadAdminSettingsRows(client: SupabaseClient<Database>, limit = 100) {
  if (isQaBypassEnabled()) {
    return getQaAdminSettingsRows().slice(0, limit);
  }

  const { data } = await client
    .from("settings")
    .select("id, key, value, description, is_public, deleted_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as Array<{
    id: string;
    key: string;
    value: unknown;
    description: string | null;
    is_public: boolean;
  }>).map((setting) => ({
    id: setting.id,
    key: setting.key,
    value: typeof setting.value === "string" ? setting.value : JSON.stringify(setting.value ?? {}, null, 2),
    description: setting.description ?? "",
    isPublic: setting.is_public,
  })) satisfies AdminSettingRow[];
}

export async function upsertAdminSetting(
  client: SupabaseClient<Database>,
  key: string,
  value: Json,
  description?: string,
  isPublic = false,
) {
  const { error } = await client
    .from("settings")
    .upsert({
      key,
      value,
      description: description ?? null,
      is_public: isPublic,
    }, { onConflict: "key" });

  return { error: error ? error.message : null };
}
