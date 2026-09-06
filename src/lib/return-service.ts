import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { isQaBypassEnabled } from "@/lib/qa-mode";
import type { OrderAccessRole } from "@/lib/order-service";
import type { OrderItem, OrderRecord } from "@/lib/orders-data";

export type ReturnPickupOption = "Home Pickup" | "Store Drop-off" | "Schedule Pickup";

export type OrderReturnRequest = {
  id: string;
  ticketNumber?: string;
  orderId: string;
  orderItemId?: string;
  productId?: string;
  productName: string;
  status: string;
  reason: string;
  requestedQuantity?: number;
  pickupOption?: ReturnPickupOption;
  pickupLocation?: string;
  createdAt: string;
  deliveryChargeNote?: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
};

const RETURN_WINDOW_DAYS = 5;

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatWindowDeadline(value: Date) {
  return value.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getReturnEligibility(
  order: Pick<OrderRecord, "status" | "deliveredAtRaw">,
  item: Pick<OrderItem, "returnable">,
  existingRequest: OrderReturnRequest | null,
  now = new Date(),
) {
  const deliveredAt = parseDate(order.deliveredAtRaw ?? null);
  const deadline = deliveredAt ? new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000) : null;

  if (!item.returnable) {
    return { eligible: false, message: "This product is not returnable.", deadline };
  }

  if (existingRequest) {
    return { eligible: false, message: `Return already ${existingRequest.status.toLowerCase()}.`, deadline };
  }

  if (order.status !== "Delivered" || !deliveredAt || !deadline) {
    return { eligible: false, message: "Returns are available only after delivery.", deadline };
  }

  if (now.getTime() > deadline.getTime()) {
    return { eligible: false, message: `Return window closed on ${formatWindowDeadline(deadline)}.`, deadline };
  }

  return { eligible: true, message: `Return available until ${formatWindowDeadline(deadline)}.`, deadline };
}

export async function createReturnRequest(
  _client: SupabaseClient<Database> | null,
  payload: {
    orderId: string;
    orderItemId: string;
    requestedQuantity: number;
    customerReason: string;
    pickupOption: ReturnPickupOption;
    pickupLocation: string;
  },
): Promise<{ error: string | null; returnRequest: OrderReturnRequest | null }> {
  if (isQaBypassEnabled()) {
    return { error: null, returnRequest: null };
  }

  if (!_client) {
    return { error: "Supabase is not configured.", returnRequest: null };
  }

  try {
    const response = await fetch("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: payload.orderId,
        orderItemId: payload.orderItemId,
        requestedQuantity: payload.requestedQuantity,
        customerReason: payload.customerReason,
        pickupOption: payload.pickupOption,
        pickupLocation: payload.pickupLocation,
      }),
    });
    const result = (await response.json()) as { error?: string; returnRequest?: OrderReturnRequest };
    if (!response.ok) return { error: result.error ?? "Unable to create the return request.", returnRequest: null };
    return { error: null, returnRequest: result.returnRequest ?? null };
  } catch {
    return { error: "Unable to reach the return service.", returnRequest: null };
  }
}

export async function loadOrderReturnRequests(
  client: SupabaseClient<Database> | null,
  orderId: string,
  userId: string | null,
  options?: { roleKey?: OrderAccessRole | null },
) {
  if (isQaBypassEnabled()) {
    return [] as OrderReturnRequest[];
  }

  if (!client) {
    return [] as OrderReturnRequest[];
  }

  const isPrivileged = options?.roleKey ? options.roleKey !== "customer" : false;
  if (!isPrivileged && !userId) {
    return [] as OrderReturnRequest[];
  }

  let query = client
    .from("returns")
    .select("id, order_id, status, customer_reason, pickup_option, pickup_location, requested_at, user_id, return_items(id, order_item_id, product_name_snapshot, requested_quantity)")
    .eq("order_id", orderId)
    .order("requested_at", { ascending: false });

  if (!isPrivileged && userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [] as OrderReturnRequest[];
  }

  type NormalizedReturnRow = {
    id: string;
    order_id: string;
    status: string;
    customer_reason: string;
    pickup_option: string | null;
    pickup_location: string | null;
    requested_at: string;
    return_items: Array<{
      id: string;
      order_item_id: string;
      product_name_snapshot: string;
      requested_quantity: number;
    }>;
  };

  return (data as unknown as NormalizedReturnRow[]).flatMap((request) =>
    (request.return_items ?? []).map((item) => ({
      id: request.id,
      ticketNumber: undefined,
      orderId: request.order_id,
      orderItemId: item.order_item_id,
      productName: item.product_name_snapshot,
      requestedQuantity: item.requested_quantity,
      status: request.status,
      reason: request.customer_reason,
      pickupOption: (request.pickup_option ?? undefined) as ReturnPickupOption | undefined,
      pickupLocation: request.pickup_location ?? undefined,
      createdAt: new Date(request.requested_at).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      deliveryChargeNote: "Delivery charge is non-refundable.",
    })),
  );
}

export async function loadAdminReturnRequests(client: SupabaseClient<Database>, limit = 25) {
  if (isQaBypassEnabled()) {
    return [] as Array<OrderReturnRequest & { orderNumber: string; customer: string }>;
  }

  const returnsResult = await client
    .from("returns")
    .select("id, order_id, user_id, status, customer_reason, pickup_option, pickup_location, requested_at, return_items(id, order_item_id, requested_quantity, product_name_snapshot)")
    .order("requested_at", { ascending: false })
    .limit(limit);

  if (returnsResult.error) {
    throw new Error("Unable to load normalized return requests.");
  }

  type NormalizedReturnRow = {
    id: string;
    order_id: string;
    user_id: string | null;
    status: string;
    customer_reason: string;
    pickup_option: string | null;
    pickup_location: string | null;
    requested_at: string;
    return_items: Array<{
      id: string;
      order_item_id: string;
      requested_quantity: number;
      product_name_snapshot: string;
    }>;
  };

  const normalizedReturns = returnsResult.data as unknown as NormalizedReturnRow[];
  const orderIds = [...new Set(normalizedReturns.map((request) => request.order_id))];
  const userIds = [...new Set(normalizedReturns.map((request) => request.user_id).filter((id): id is string => Boolean(id)))];
  const orderItemIds = [...new Set(normalizedReturns.flatMap((request) => request.return_items.map((item) => item.order_item_id)))];

  const [ordersResult, profilesResult, orderItemsResult] = await Promise.all([
    orderIds.length ? client.from("orders").select("id, order_number").in("id", orderIds) : Promise.resolve({ data: [], error: null }),
    userIds.length ? client.from("profiles").select("id, full_name, email").in("id", userIds) : Promise.resolve({ data: [], error: null }),
    orderItemIds.length ? client.from("order_items").select("id, quantity").in("id", orderItemIds) : Promise.resolve({ data: [], error: null }),
  ]);

  if (ordersResult.error || profilesResult.error || orderItemsResult.error) {
    throw new Error("Unable to load normalized return details.");
  }

  const orders = new Map(
    ((ordersResult.data ?? []) as Array<{ id: string; order_number: string }>).map((order) => [order.id, order.order_number]),
  );
  const customers = new Map(
    ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile.full_name?.trim() || profile.email]),
  );
  const purchasedQuantities = new Map(
    ((orderItemsResult.data ?? []) as Array<{ id: string; quantity: number }>).map((item) => [item.id, item.quantity]),
  );

  return normalizedReturns.map((request) => {
    const items = request.return_items ?? [];
    return {
      id: request.id,
      ticketNumber: request.id,
      orderId: request.order_id,
      orderNumber: orders.get(request.order_id) ?? request.order_id,
      customer: request.user_id ? customers.get(request.user_id) ?? "Customer unavailable" : "Customer unavailable",
      productName: items.map((item) => item.product_name_snapshot).join(" • ") || "No item snapshot",
      requestedQuantity: items.reduce((total, item) => total + item.requested_quantity, 0),
      purchasedQuantity: items.reduce((total, item) => total + (purchasedQuantities.get(item.order_item_id) ?? 0), 0),
      status: request.status,
      reason: request.customer_reason,
      pickupOption: request.pickup_option ?? "Not provided",
      pickupLocation: request.pickup_location ?? "Not provided",
      createdAt: new Date(request.requested_at).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      deliveryChargeNote: "Delivery charge is non-refundable.",
    };
  });
}
