import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { isQaBypassEnabled } from "@/lib/qa-mode";
import type { OrderAccessRole } from "@/lib/order-service";
import type { OrderItem, OrderRecord } from "@/lib/orders-data";

export type ReturnPickupOption = "Home Pickup" | "Store Drop-off" | "Schedule Pickup";

export type OrderReturnRequest = {
  id: string;
  ticketNumber: string;
  orderId: string;
  productId: string;
  productName: string;
  status: string;
  reason: string;
  pickupOption: ReturnPickupOption;
  pickupLocation: string;
  createdAt: string;
  deliveryChargeNote: string;
};

type SupportTicketRow = {
  id: string;
  ticket_number: string;
  status: string;
  description: string;
  order_id: string | null;
  product_id: string | null;
  created_at: string;
  user_id: string;
  deleted_at: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  deleted_at: string | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  user_id: string;
  deleted_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
};

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseReturnDescription(description: string) {
  const reasonMatch = description.match(/^Reason:\s*(.+)$/im);
  const pickupMatch = description.match(/^Pickup option:\s*(.+)$/im);
  const locationMatch = description.match(/^Pickup location:\s*(.+)$/im);
  const chargeMatch = description.match(/^Delivery charge:\s*(.+)$/im);

  return {
    reason: reasonMatch?.[1]?.trim() || description.trim(),
    pickupOption: (pickupMatch?.[1]?.trim() || "Home Pickup") as ReturnPickupOption,
    pickupLocation: locationMatch?.[1]?.trim() || "Not provided",
    deliveryChargeNote: chargeMatch?.[1]?.trim() || "Delivery charge is non-refundable.",
  };
}

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

function makeReturnTicketNumber() {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RTN-${Date.now().toString().slice(-8)}-${suffix}`;
}

export async function createReturnRequest(
  client: SupabaseClient<Database> | null,
  payload: {
    orderId: string;
    productId: string;
    productName: string;
    reason: string;
    pickupOption: ReturnPickupOption;
    pickupLocation: string;
  },
): Promise<{ error: string | null; ticketNumber: string | null }> {
  if (isQaBypassEnabled()) {
    return { error: null, ticketNumber: makeReturnTicketNumber() };
  }

  if (!client) {
    return { error: "Supabase is not configured.", ticketNumber: null };
  }

  const { data: authData } = await client.auth.getUser();
  const userId = authData.user?.id ?? null;
  if (!userId) {
    return { error: "Please sign in to request a return.", ticketNumber: null };
  }

  const reason = payload.reason.trim();
  const pickupOption = payload.pickupOption;
  const pickupLocation = payload.pickupLocation.trim();
  if (!reason) {
    return { error: "Please share a return reason.", ticketNumber: null };
  }
  if (!pickupLocation) {
    return { error: "Please share a pickup location.", ticketNumber: null };
  }

  const { data: orderRow, error: orderError } = await client
    .from("orders")
    .select("id, user_id, status, delivered_at, deleted_at")
    .eq("id", payload.orderId)
    .is("deleted_at", null)
    .maybeSingle();

  if (orderError || !orderRow) {
    return { error: "Unable to validate the order for returns.", ticketNumber: null };
  }

  const orderUserId = (orderRow as { user_id?: string | null }).user_id ?? null;
  if (orderUserId && orderUserId !== userId) {
    return { error: "This order does not belong to the signed-in customer.", ticketNumber: null };
  }

  const deliveredAt = parseDate((orderRow as { delivered_at: string | null }).delivered_at);
  const deadline = deliveredAt ? new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000) : null;
  if ((orderRow as { status: string }).status?.toLowerCase() !== "delivered" || !deliveredAt || !deadline) {
    return { error: "Returns are available only after delivery.", ticketNumber: null };
  }

  if (Date.now() > deadline.getTime()) {
    return { error: `Returns are allowed only within 5 days of delivery.`, ticketNumber: null };
  }

  const { data: itemRow } = await client
    .from("order_items")
    .select("id, order_id, product_id, deleted_at")
    .eq("order_id", payload.orderId)
    .eq("product_id", payload.productId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!itemRow) {
    return { error: "Unable to verify the selected item.", ticketNumber: null };
  }

  const { data: productRow } = await client
    .from("products")
    .select("id, attributes, deleted_at")
    .eq("id", payload.productId)
    .is("deleted_at", null)
    .maybeSingle();

  const attributes = (productRow as { attributes: Record<string, unknown> | null } | null)?.attributes ?? null;
  const isReturnable = Boolean(attributes?.returnable ?? attributes?.is_returnable ?? attributes?.returnable_product);
  if (!isReturnable) {
    return { error: "This product is not marked as returnable.", ticketNumber: null };
  }

  const { data: existingReturn } = await client
    .from("support_tickets")
    .select("id, status, description")
    .eq("order_id", payload.orderId)
    .eq("product_id", payload.productId)
    .eq("category", "Returns")
    .is("deleted_at", null)
    .maybeSingle();

  if (existingReturn) {
    return { error: "A return request already exists for this item.", ticketNumber: null };
  }

  const description = [
    `Reason: ${reason}`,
    `Pickup option: ${pickupOption}`,
    `Pickup location: ${pickupLocation}`,
    "Delivery charge: Non-refundable",
  ].join("\n");

  const ticketNumber = makeReturnTicketNumber();

  const { error } = await client.from("support_tickets").insert({
    user_id: userId,
    ticket_number: ticketNumber,
    subject: `Return request for ${payload.productName}`,
    category: "Returns",
    status: "open",
    priority: "medium",
    description,
    order_id: payload.orderId,
    product_id: payload.productId,
  });

  return { error: error ? error.message : null, ticketNumber: error ? null : ticketNumber };
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
    .from("support_tickets")
    .select("id, ticket_number, status, description, order_id, product_id, created_at, user_id, deleted_at")
    .eq("order_id", orderId)
    .eq("category", "Returns")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!isPrivileged && userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [] as OrderReturnRequest[];
  }

  const tickets = data as SupportTicketRow[];
  const productIds = Array.from(new Set(tickets.map((ticket) => ticket.product_id).filter((value): value is string => Boolean(value))));

  const { data: productsData } =
    productIds.length > 0
      ? await client.from("products").select("id, name, deleted_at").in("id", productIds).is("deleted_at", null)
      : { data: [] as ProductRow[] };

  const products = new Map(((productsData ?? []) as ProductRow[]).map((product) => [product.id, product.name]));

  return tickets.map((ticket) => {
    const parsed = parseReturnDescription(ticket.description);
    return {
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      orderId: ticket.order_id ?? orderId,
      productId: ticket.product_id ?? "",
      productName: products.get(ticket.product_id ?? "") ?? "Product",
      status: titleCase(ticket.status),
      reason: parsed.reason,
      pickupOption: parsed.pickupOption,
      pickupLocation: parsed.pickupLocation,
      createdAt: new Date(ticket.created_at).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      deliveryChargeNote: parsed.deliveryChargeNote,
    };
  });
}

export async function loadAdminReturnRequests(client: SupabaseClient<Database>, limit = 25) {
  if (isQaBypassEnabled()) {
    return [] as Array<OrderReturnRequest & { orderNumber: string; customer: string }>;
  }

  const [ticketsResult, ordersResult, profilesResult, productsResult] = await Promise.all([
    client
      .from("support_tickets")
      .select("id, ticket_number, status, description, order_id, product_id, created_at, user_id, deleted_at")
      .eq("category", "Returns")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit),
    client.from("orders").select("id, order_number, user_id, deleted_at").is("deleted_at", null),
    client.from("profiles").select("id, full_name, email").is("deleted_at", null),
    client.from("products").select("id, name, deleted_at").is("deleted_at", null),
  ]);

  const orders = new Map(
    ((ordersResult.data ?? []) as OrderRow[]).map((order) => [order.id, order.order_number]),
  );
  const customers = new Map(
    ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile.full_name?.trim() || profile.email]),
  );
  const products = new Map(
    ((productsResult.data ?? []) as ProductRow[]).map((product) => [product.id, product.name]),
  );

  return ((ticketsResult.data ?? []) as SupportTicketRow[]).map((ticket) => {
    const parsed = parseReturnDescription(ticket.description);
    return {
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      orderId: ticket.order_id ?? "",
      orderNumber: ticket.order_id ? orders.get(ticket.order_id) ?? ticket.order_id.slice(0, 8).toUpperCase() : "ORDER",
      customer: customers.get(ticket.user_id) ?? ticket.user_id.slice(0, 8).toUpperCase(),
      productId: ticket.product_id ?? "",
      productName: products.get(ticket.product_id ?? "") ?? "Product",
      status: titleCase(ticket.status),
      reason: parsed.reason,
      pickupOption: parsed.pickupOption,
      pickupLocation: parsed.pickupLocation,
      createdAt: new Date(ticket.created_at).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      deliveryChargeNote: parsed.deliveryChargeNote,
    };
  });
}
