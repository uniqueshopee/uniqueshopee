import { NextResponse } from "next/server";
import { resolveSupabaseRequestAuth } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type ReturnBody = {
  orderId?: unknown;
  orderItemId?: unknown;
  requestedQuantity?: unknown;
  customerReason?: unknown;
  pickupOption?: unknown;
  pickupLocation?: unknown;
};

type ReturnRequestResult = {
  return_id: string;
  status: string;
  order_id: string;
  order_item_id: string;
  product_name: string;
  requested_quantity: number;
  reason: string;
  requested_at: string;
};

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function integerValue(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

const ERROR_RESPONSES: Record<string, { error: string; status: number }> = {
  P1001: { error: "Invalid return request.", status: 400 },
  P1002: { error: "Order not found.", status: 404 },
  P1003: { error: "This order does not belong to you.", status: 403 },
  P1004: { error: "Returns are available only after delivery.", status: 400 },
  P1005: { error: "This order has no valid delivery date.", status: 400 },
  P1006: { error: "The 5-day return window has expired.", status: 400 },
  P1007: { error: "The selected item was not found in this order.", status: 404 },
  P1008: { error: "This product is not marked as returnable.", status: 400 },
  P1009: { error: "Requested quantity exceeds the purchased quantity.", status: 400 },
  P1010: { error: "This quantity is no longer available for return. Please refresh the order and try again.", status: 409 },
};

export async function POST(request: Request) {
  const auth = await resolveSupabaseRequestAuth(request);
  if (!auth.configured) return errorResponse("Supabase is not configured.", 503);
  if (auth.invalidBearer || !auth.user) return errorResponse("Authentication required.", 401);

  const admin = getSupabaseAdminClient();
  if (!admin) return errorResponse("Return requests are temporarily unavailable.", 503);

  let body: ReturnBody;
  try {
    body = (await request.json()) as ReturnBody;
  } catch {
    return errorResponse("Invalid return request.", 400);
  }

  const orderId = textValue(body.orderId);
  const orderItemId = textValue(body.orderItemId);
  const customerReason = textValue(body.customerReason);
  const requestedQuantity = integerValue(body.requestedQuantity);
  const pickupOption = textValue(body.pickupOption);
  const pickupLocation = textValue(body.pickupLocation);

  if (!orderId || !orderItemId || !customerReason || customerReason.length > 1000 || requestedQuantity === null || requestedQuantity < 1) {
    return errorResponse("Invalid return request.", 400);
  }

  const { data, error } = await admin.rpc("create_customer_return_request", {
    p_user_id: auth.user.id,
    p_order_id: orderId,
    p_order_item_id: orderItemId,
    p_requested_quantity: requestedQuantity,
    p_customer_reason: customerReason,
    p_pickup_option: pickupOption || null,
    p_pickup_location: pickupLocation || null,
  });

  if (error) {
    const diagnosticError = error as typeof error & {
      status?: number;
      statusCode?: number;
    };
    console.error("[RETURN_RPC_ERROR]", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      status: diagnosticError.status,
      statusCode: diagnosticError.statusCode,
    });
    const mapped = ERROR_RESPONSES[error.code];
    return errorResponse(mapped?.error ?? "Unable to create the return request.", mapped?.status ?? 500);
  }

  const row = (Array.isArray(data) ? data[0] : data) as unknown as ReturnRequestResult | null;
  if (!row) return errorResponse("Unable to create the return request.", 500);

  return NextResponse.json({
    returnRequest: {
      id: row.return_id,
      orderId: row.order_id,
      orderItemId: row.order_item_id,
      productName: row.product_name,
      requestedQuantity: row.requested_quantity,
      status: row.status,
      reason: row.reason,
      createdAt: row.requested_at,
    },
  }, { status: 201 });
}
