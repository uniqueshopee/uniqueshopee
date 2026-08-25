import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { resolveSupabaseRequestAuth } from "@/lib/supabase/server";
import { getRazorpaySecretKey } from "@/lib/razorpay-config";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";

type VerifyRazorpayPaymentBody = {
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  expectedAmount?: number;
  currency?: string | null;
  shippingAddressId?: string | null;
  billingAddressId?: string | null;
  paymentMethod?: string | null;
  couponCode?: string | null;
  notes?: string | null;
  shippingAddressSnapshot?: Record<string, unknown> | null;
  billingAddressSnapshot?: Record<string, unknown> | null;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeEqual(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function POST(request: Request) {
  const auth = await resolveSupabaseRequestAuth(request);
  if (!auth.configured) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  if (auth.invalidBearer || !auth.client || !auth.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const client = auth.client;
  const user = auth.user;

  const keySecret = getRazorpaySecretKey();
  if (!keySecret) {
    return NextResponse.json({ error: "Razorpay is not configured." }, { status: 503 });
  }

  let body: VerifyRazorpayPaymentBody = {};
  try {
    body = (await request.json()) as VerifyRazorpayPaymentBody;
  } catch {
    body = {};
  }

  const razorpayPaymentId = asText(body.razorpayPaymentId);
  const razorpayOrderId = asText(body.razorpayOrderId);
  const razorpaySignature = asText(body.razorpaySignature);

  if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
    return NextResponse.json({ error: "Missing Razorpay payment payload." }, { status: 400 });
  }

  const generatedSignature = crypto.createHmac("sha256", keySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
  if (!safeEqual(generatedSignature, razorpaySignature)) {
    return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
  }

  const { data: existingOrder } = await client
    .from("orders")
    .select("id, order_number")
    .eq("user_id", user.id)
    .eq("payment_reference", razorpayPaymentId)
    .maybeSingle();

  if (existingOrder) {
    return NextResponse.json({
      orderId: existingOrder.id,
      orderNumber: existingOrder.order_number,
      alreadyCreated: true,
    });
  }

  const couponCode = typeof body.couponCode === "string" && body.couponCode.trim().length > 0 ? body.couponCode.trim() : null;
  const { data: pricingData, error: pricingError } = await client.rpc("calculate_checkout_pricing", {
    p_coupon_code: couponCode,
  });

  if (pricingError) {
    return NextResponse.json({ error: pricingError.message ?? "Unable to verify checkout totals." }, { status: 400 });
  }

  const pricing = Array.isArray(pricingData) ? pricingData[0] : pricingData;
  const currentAmount = Math.max(0, Math.round(Number((pricing as Record<string, unknown> | null)?.total_amount ?? 0) * 100));
  const expectedAmount = typeof body.expectedAmount === "number" ? Math.max(0, Math.round(body.expectedAmount)) : currentAmount;
  const currency = typeof body.currency === "string" && body.currency.trim().length > 0 ? body.currency.trim().toUpperCase() : "INR";

  if (currentAmount !== expectedAmount || currency !== "INR") {
    return NextResponse.json(
      {
        error: "Checkout totals changed while payment was in progress. Please try again.",
      },
      { status: 409 },
    );
  }

  const shippingAddressSnapshot = body.shippingAddressSnapshot ?? null;
  const billingAddressSnapshot = body.billingAddressSnapshot ?? null;
  const notes = typeof body.notes === "string" && body.notes.trim().length > 0 ? body.notes.trim() : null;
  const paymentMethod = typeof body.paymentMethod === "string" && body.paymentMethod.trim().length > 0 ? body.paymentMethod.trim() : "Razorpay";

  const { data, error } = await client.rpc("create_checkout_order", {
    p_shipping_address_id: body.shippingAddressId ?? null,
    p_billing_address_id: body.billingAddressId ?? null,
    p_payment_method: paymentMethod,
    p_payment_reference: razorpayPaymentId,

    p_coupon_code: couponCode,
    p_notes: notes,
    p_shipping_address_snapshot: shippingAddressSnapshot as Json | null,
    p_billing_address_snapshot: billingAddressSnapshot as Json | null,
  });

  if (error) {
    return NextResponse.json({ error: error.message ?? "Unable to finalize checkout." }, { status: 400 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof (result as { order_id?: unknown }).order_id !== "string") {
    return NextResponse.json({ error: "Unable to finalize checkout." }, { status: 400 });
  }

  return NextResponse.json({
    orderId: (result as { order_id: string }).order_id,
    orderNumber: (result as { order_number: string }).order_number,
    alreadyCreated: false,
  });
}
