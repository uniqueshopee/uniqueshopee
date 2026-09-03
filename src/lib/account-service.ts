import type { SupabaseClient } from "@supabase/supabase-js";
import { loadOrdersForViewer } from "@/lib/order-service";
import { loadRemoteWishlistProductIds } from "@/lib/wishlist-service";
import { loadUserAddresses } from "@/lib/address-service";

type OrderStatus = "pending" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled" | "returned" | "refunded";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  read_at: string | null;
  action_label: string | null;
  action_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  deleted_at: string | null;
};

type CouponRow = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  coupon_type: "percentage" | "flat";
  value: number | string;
  minimum_order: number | string;
  maximum_discount: number | string;
  usage_limit: number | null;
  per_user_limit: number;
  start_at: string | null;
  expiry_at: string | null;
  status: "active" | "inactive" | "expired";
  applies_to: Record<string, unknown> | null;
  deleted_at: string | null;
};

type CouponUsageRow = {
  coupon_id: string;
  order_id: string | null;
  discount_amount: number | string;
  used_at: string;
  deleted_at: string | null;
};

export type AccountOverview = {
  ordersCount: number;
  wishlistCount: number;
  addressCount: number;
  unreadNotifications: number;
  availableCouponCount: number;
  totalSpent: number;
  rewardPoints: number;
  rewardTier: "Silver" | "Gold" | "Platinum";
  nextTierPoints: number;
  nextRewardLabel: string;
  recentOrderCount: number;
  latestOrder: {
    id: string;
    number: string;
    status: OrderStatus;
    total: number;
    placedAt: string;
  } | null;
};

export type LiveNotification = {
  id: string;
  title: string;
  message: string;
  category: "Orders" | "Offers" | "Wishlist" | "Account" | "System";
  actionLabel: string | null;
  actionUrl: string | null;
  unread: boolean;
  createdAt: string;
  timestamp: string;
  previewTitle: string | null;
  previewSubtitle: string | null;
  type: string;
};

export type LiveCoupon = {
  id: string;
  code: string;
  title: string;
  description: string;
  discount: string;
  expiry: string;
  terms: string;
  category: "Paint Offers" | "Plumbing Offers" | "Festival Offers" | "Bank Offers" | "New User" | "Contractor Deals";
  minimumOrder: string;
  maximumDiscount: string;
  status: "Available" | "Applied" | "Used" | "Expired";
  couponType: "percentage" | "flat";
  rawValue: number;
  appliesTo: string;
};

export type RewardHistoryItem = {
  id: string;
  title: string;
  description: string;
  points: number;
  status: "Earned" | "Redeemed" | "Pending";
  date: string;
  sortKey?: string;
};

export type RewardSnapshot = {
  currentPoints: number;
  tier: "Silver" | "Gold" | "Platinum";
  nextTierPoints: number;
  nextReward: string;
  history: RewardHistoryItem[];
  earnWays: Array<{ id: string; title: string; description: string; points: string }>;
  redeemOptions: Array<{ id: string; title: string; description: string; points: string }>;
};

function toNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");
  return formatter.format(diffDays, "day");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function deriveNotificationCategory(type: string, title: string, message: string) {
  const text = `${type} ${title} ${message}`.toLowerCase();
  if (text.includes("order") || text.includes("shipment") || text.includes("delivery")) return "Orders";
  if (text.includes("coupon") || text.includes("offer") || text.includes("sale") || text.includes("discount")) return "Offers";
  if (text.includes("wishlist") || text.includes("stock") || text.includes("price")) return "Wishlist";
  if (text.includes("login") || text.includes("password") || text.includes("security") || text.includes("account")) return "Account";
  return "System";
}

function deriveNotificationPreview(actionUrl: string | null, metadata: Record<string, unknown> | null, title: string) {
  if (typeof metadata?.previewTitle === "string") {
    return {
      previewTitle: metadata.previewTitle,
      previewSubtitle: typeof metadata.previewSubtitle === "string" ? metadata.previewSubtitle : null,
    };
  }

  if (actionUrl?.includes("/orders/")) {
    return { previewTitle: title, previewSubtitle: "Open order details" };
  }

  if (actionUrl?.includes("/product/")) {
    return { previewTitle: title, previewSubtitle: "Open product details" };
  }

  if (actionUrl?.includes("/coupons")) {
    return { previewTitle: title, previewSubtitle: "Open coupons" };
  }

  return { previewTitle: title, previewSubtitle: null };
}

function deriveCouponCategory(coupon: CouponRow) {
  const appliesTo = JSON.stringify(coupon.applies_to ?? {}).toLowerCase();
  const title = `${coupon.title} ${coupon.description ?? ""}`.toLowerCase();
  const text = `${appliesTo} ${title}`;

  if (text.includes("paint")) return "Paint Offers";
  if (text.includes("plumb")) return "Plumbing Offers";
  if (text.includes("festival") || text.includes("diwali") || text.includes("holiday")) return "Festival Offers";
  if (text.includes("bank") || text.includes("card") || text.includes("upi")) return "Bank Offers";
  if (text.includes("new user")) return "New User";
  return "Contractor Deals";
}

function deriveCouponTerms(coupon: CouponRow) {
  const parts = [
    `Minimum order ${toNumber(coupon.minimum_order) > 0 ? `₹${toNumber(coupon.minimum_order).toFixed(0)}` : "not required"}`,
    coupon.usage_limit ? `Usage limit ${coupon.usage_limit}` : "No global usage limit",
    `Per-user limit ${coupon.per_user_limit}`,
  ];
  return parts.join(" • ");
}

function deriveCouponStatus(coupon: CouponRow, currentCouponCode: string | null, userUsageCount: number) {
  const now = Date.now();
  const expiryAt = coupon.expiry_at ? new Date(coupon.expiry_at).getTime() : null;
  const startAt = coupon.start_at ? new Date(coupon.start_at).getTime() : null;
  if (coupon.status !== "active") return "Expired" as const;
  if (typeof expiryAt === "number" && !Number.isNaN(expiryAt) && expiryAt < now) return "Expired" as const;
  if (typeof startAt === "number" && !Number.isNaN(startAt) && startAt > now) return "Expired" as const;
  if (currentCouponCode === coupon.code) return "Applied" as const;
  if (userUsageCount > 0) return "Used" as const;
  return "Available" as const;
}

function rewardTierForPoints(points: number): AccountOverview["rewardTier"] {
  if (points >= 3000) return "Platinum";
  if (points >= 1200) return "Gold";
  return "Silver";
}

function tierProgress(points: number) {
  if (points >= 3000) return { nextTierPoints: 3000, nextReward: "Platinum Benefits" };
  if (points >= 1200) return { nextTierPoints: 3000, nextReward: "Platinum Benefits" };
  return { nextTierPoints: 1200, nextReward: "Gold Benefits" };
}

function pointsFromOrder(totalAmount: number) {
  return Math.max(0, Math.floor(totalAmount / 20));
}

function pointsFromCouponUsage(discountAmount: number) {
  return Math.max(0, Math.floor(discountAmount / 10));
}

export async function loadAccountOverview(client: SupabaseClient | null, userId: string | null, currentCouponCode: string | null = null) {
  if (!client || !userId) {
    return {
      ordersCount: 0,
      wishlistCount: 0,
      addressCount: 0,
      unreadNotifications: 0,
      availableCouponCount: 0,
      totalSpent: 0,
      rewardPoints: 0,
      rewardTier: "Silver" as const,
      nextTierPoints: 1200,
      nextRewardLabel: "Gold Benefits",
      recentOrderCount: 0,
      latestOrder: null,
    };
  }

  const [orders, addresses, wishlistIds, notificationsResult, couponsResult, couponUsageResult] = await Promise.all([
    loadOrdersForViewer(client, userId),
    loadUserAddresses(userId, client),
    loadRemoteWishlistProductIds(userId, client),
    client
      .from("notifications")
      .select("id, title, message, type, is_read, read_at, action_label, action_url, metadata, created_at, deleted_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    client
      .from("coupons")
      .select("id, code, title, description, coupon_type, value, minimum_order, maximum_discount, usage_limit, per_user_limit, start_at, expiry_at, status, applies_to, deleted_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    client
      .from("coupon_usage")
      .select("coupon_id, order_id, discount_amount, used_at, deleted_at")
      .eq("user_id", userId)
      .is("deleted_at", null),
  ]);

  const notifications = ((notificationsResult.data ?? []) as NotificationRow[]).filter((row) => row.deleted_at === null);
  const coupons = ((couponsResult.data ?? []) as CouponRow[]).filter((row) => row.deleted_at === null);
  const couponUsages = ((couponUsageResult.data ?? []) as CouponUsageRow[]).filter((row) => row.deleted_at === null);

  const totalSpent = orders.reduce((sum, order) => sum + toNumber(order.grandTotal), 0);
  const earnedPoints = orders.reduce((sum, order) => sum + pointsFromOrder(toNumber(order.grandTotal)), 0);
  const redeemedPoints = couponUsages.reduce((sum, row) => sum + pointsFromCouponUsage(toNumber(row.discount_amount)), 0);
  const rewardPoints = Math.max(0, earnedPoints - redeemedPoints);
  const tier = rewardTierForPoints(rewardPoints);
  const progression = tierProgress(rewardPoints);
  const latestOrder = orders[0]
    ? {
        id: orders[0].id,
        number: orders[0].orderNumber,
        status: orders[0].status as OrderStatus,
        total: toNumber(orders[0].grandTotal),
        placedAt: orders[0].placedAt,
      }
    : null;

  return {
    ordersCount: orders.length,
    wishlistCount: wishlistIds.length,
    addressCount: addresses.length,
    unreadNotifications: notifications.filter((row) => !row.is_read).length,
    availableCouponCount: coupons.filter((coupon) => deriveCouponStatus(coupon, currentCouponCode, couponUsages.filter((usage) => usage.coupon_id === coupon.id).length) === "Available").length,
    totalSpent,
    rewardPoints,
    rewardTier: tier,
    nextTierPoints: progression.nextTierPoints,
    nextRewardLabel: progression.nextReward,
    recentOrderCount: Math.min(orders.length, 5),
    latestOrder,
  } satisfies AccountOverview;
}

export async function loadLiveNotifications(client: SupabaseClient | null, userId: string | null) {
  const result = await loadLiveNotificationsResult(client, userId);
  return result.data;
}

export async function loadLiveNotificationsResult(client: SupabaseClient | null, userId: string | null) {
  if (!client || !userId) {
    return { data: [] as LiveNotification[], error: client ? null : "Supabase is not configured." };
  }

  const { data, error } = await client
    .from("notifications")
    .select("id, title, message, type, is_read, read_at, action_label, action_url, metadata, created_at, deleted_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return { data: [] as LiveNotification[], error: error?.message ?? "Unable to load notifications." };
  }

  return { data: (data as NotificationRow[]).map((row) => {
    const category = deriveNotificationCategory(row.type, row.title, row.message);
    const preview = deriveNotificationPreview(row.action_url, row.metadata, row.title);

    return {
      id: row.id,
      title: row.title,
      message: row.message,
      category,
      actionLabel: row.action_label,
      actionUrl: row.action_url,
      unread: !row.is_read,
      createdAt: row.created_at,
      timestamp: formatRelativeTime(row.created_at),
      previewTitle: preview.previewTitle,
      previewSubtitle: preview.previewSubtitle,
      type: row.type,
    };
  }), error: null };
}

export async function loadUnreadNotificationCount(client: SupabaseClient | null, userId: string | null) {
  if (!client || !userId) return { count: 0, error: client ? null : "Supabase is not configured." };
  const { count, error } = await client.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false).is("deleted_at", null);
  return { count: count ?? 0, error: error?.message ?? null };
}

export function subscribeToUserNotifications(client: SupabaseClient | null, userId: string | null, onChange: () => void) {
  if (!client || !userId) return () => undefined;
  const channel = client.channel(`user-notifications-${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, onChange).subscribe();
  return () => { void client.removeChannel(channel); };
}

export async function markNotificationRead(client: SupabaseClient | null, userId: string | null, notificationId: string) {
  if (!client || !userId) return { error: "Supabase is not configured." };
  const { error } = await client
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("deleted_at", null);
  return { error: error ? error.message : null };
}

export async function markAllNotificationsRead(client: SupabaseClient | null, userId: string | null) {
  if (!client || !userId) return { error: "Supabase is not configured." };
  const { error } = await client.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("user_id", userId).eq("is_read", false).is("deleted_at", null);
  return { error: error ? error.message : null };
}

export async function deleteNotification(client: SupabaseClient | null, userId: string | null, notificationId: string) {
  if (!client || !userId) return { error: "Supabase is not configured." };
  const { error } = await client
    .from("notifications")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("deleted_at", null);
  return { error: error ? error.message : null };
}

export async function loadLiveCoupons(client: SupabaseClient | null, userId: string | null, currentCouponCode: string | null = null) {
  if (!client) {
    return [] as LiveCoupon[];
  }

  const [couponsResult, usageResult] = await Promise.all([
    client
      .from("coupons")
      .select("id, code, title, description, coupon_type, value, minimum_order, maximum_discount, usage_limit, per_user_limit, start_at, expiry_at, status, applies_to, deleted_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    userId
      ? client.from("coupon_usage").select("coupon_id, order_id, discount_amount, used_at, deleted_at").eq("user_id", userId).is("deleted_at", null)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const coupons = ((couponsResult.data ?? []) as CouponRow[]).filter((row) => row.deleted_at === null);
  const usages = ((usageResult.data ?? []) as CouponUsageRow[]).filter((row) => row.deleted_at === null);
  const usageByCoupon = new Map<string, CouponUsageRow[]>();
  usages.forEach((usage) => {
    const current = usageByCoupon.get(usage.coupon_id) ?? [];
    current.push(usage);
    usageByCoupon.set(usage.coupon_id, current);
  });

  return coupons.map((coupon) => {
    const usedCount = usageByCoupon.get(coupon.id)?.length ?? 0;
    const status = deriveCouponStatus(coupon, currentCouponCode, usedCount);
    const discount = coupon.coupon_type === "percentage" ? `${toNumber(coupon.value)}% OFF` : `₹${toNumber(coupon.value)} OFF`;

    return {
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description?.trim() || coupon.title,
      discount,
      expiry: coupon.expiry_at ? new Date(coupon.expiry_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "No expiry",
      terms: deriveCouponTerms(coupon),
      category: deriveCouponCategory(coupon),
      minimumOrder: `₹${toNumber(coupon.minimum_order).toFixed(0)}`,
      maximumDiscount: coupon.maximum_discount && toNumber(coupon.maximum_discount) > 0 ? `₹${toNumber(coupon.maximum_discount).toFixed(0)}` : "Unlimited",
      status,
      couponType: coupon.coupon_type,
      rawValue: toNumber(coupon.value),
      appliesTo: JSON.stringify(coupon.applies_to ?? {}),
    } satisfies LiveCoupon;
  });
}

export async function loadRewardSnapshot(client: SupabaseClient | null, userId: string | null) {
  if (!client || !userId) {
    return {
      currentPoints: 0,
      tier: "Silver" as const,
      nextTierPoints: 1200,
      nextReward: "Gold Benefits",
      history: [] as RewardHistoryItem[],
      earnWays: [] as RewardSnapshot["earnWays"],
      redeemOptions: [] as RewardSnapshot["redeemOptions"],
    };
  }

  const [orders, couponUsageResult, couponsResult] = await Promise.all([
    loadOrdersForViewer(client, userId),
    client.from("coupon_usage").select("coupon_id, order_id, discount_amount, used_at, deleted_at").eq("user_id", userId).is("deleted_at", null),
    client
      .from("coupons")
      .select("id, code, title, description, coupon_type, value, minimum_order, maximum_discount, usage_limit, per_user_limit, start_at, expiry_at, status, applies_to, deleted_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const usages = ((couponUsageResult.data ?? []) as CouponUsageRow[]).filter((row) => row.deleted_at === null);
  const coupons = ((couponsResult.data ?? []) as CouponRow[]).filter((row) => row.deleted_at === null);
  const earnedHistory = orders
    .map((order) => {
      const points = pointsFromOrder(toNumber(order.grandTotal));
      const isDelivered = String(order.status) === "delivered";
      return {
        id: order.id,
        title: `Order ${order.orderNumber}`,
        description: isDelivered ? "Delivered order reward" : "Pending order reward",
        points,
        status: isDelivered ? ("Earned" as const) : ("Pending" as const),
        date: formatDateTime(order.placedAt),
        sortKey: order.placedAt,
      };
    })
    .filter((item) => item.points > 0);

  const redeemedHistory = usages.map((usage, index) => ({
    id: usage.order_id ?? `${usage.coupon_id}-${index}`,
    title: "Coupon redemption",
    description: "Real discount applied from your order history",
    points: pointsFromCouponUsage(toNumber(usage.discount_amount)),
    status: "Redeemed" as const,
    date: formatDateTime(usage.used_at),
    sortKey: usage.used_at,
  }));

  const history = [...earnedHistory, ...redeemedHistory]
    .sort((left, right) => new Date(right.sortKey ?? right.date).getTime() - new Date(left.sortKey ?? left.date).getTime())
    .slice(0, 12);

  const currentPoints = Math.max(
    0,
    earnedHistory.reduce((sum, item) => sum + item.points, 0) - redeemedHistory.reduce((sum, item) => sum + item.points, 0),
  );
  const tier = rewardTierForPoints(currentPoints);
  const progression = tierProgress(currentPoints);

  const redeemOptions = coupons.slice(0, 4).map((coupon) => ({
    id: coupon.id,
    title: coupon.title,
    description: coupon.description?.trim() || coupon.code,
    points: coupon.coupon_type === "percentage" ? `${toNumber(coupon.value) * 10} pts` : `${toNumber(coupon.value) * 5} pts`,
  }));

  return {
    currentPoints,
    tier,
    nextTierPoints: progression.nextTierPoints,
    nextReward: progression.nextReward,
    history,
    earnWays: [
      { id: "orders", title: "Place Orders", description: "Earn points from every completed order", points: "1 pt / ₹20" },
      { id: "reviews", title: "Write Reviews", description: "Share product feedback after delivery", points: "20 pts" },
      { id: "referrals", title: "Invite Friends", description: "Bring new shoppers into UniqueShopee", points: "50 pts" },
    ],
    redeemOptions,
  } satisfies RewardSnapshot;
}

export async function softDeleteCurrentProfile(client: SupabaseClient | null, userId: string | null) {
  if (!client || !userId) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await client
    .from("profiles")
    .update({ deleted_at: new Date().toISOString(), status: "deleted" })
    .eq("id", userId)
    .is("deleted_at", null);

  return { error: error ? error.message : null };
}
