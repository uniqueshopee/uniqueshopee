import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveSupabaseRequestAuth } from "@/lib/supabase/server";
import {
  getCashfreeApiBaseUrl,
  getCashfreeApiVersion,
  getCashfreeClientId,
  getCashfreeClientSecret,
  getCashfreeEnvironment,
} from "@/lib/cashfree-config";
import { getSupabaseEnvironment } from "@/lib/supabase/env";
import type { Json } from "@/lib/supabase/types";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

type CreateCashfreeOrderBody = {
  couponCode?: string | null;
  requestId?: string | null;
  shippingAddressId?: string | null;
  billingAddressId?: string | null;
  notes?: string | null;
  shippingAddressSnapshot?: Record<string, unknown> | null;
  billingAddressSnapshot?: Record<string, unknown> | null;
};

type AddressRow = {
  id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  area: string | null;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  address_type: string;
};

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function getRequestId(value: string | null | undefined) {
  const candidate = (value ?? "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : crypto.randomUUID();
}

function getCheckoutGroupId(input: unknown) {
  const bytes = crypto.createHash("sha256").update(JSON.stringify(input)).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function buildAddressSnapshot(address: AddressRow) {
  return {
    name: address.full_name,
    full_name: address.full_name,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? "",
    landmark: address.landmark ?? "",
    area: address.area ?? "",
    city: address.city,
    state: address.state,
    country: address.country,
    pin_code: address.pin_code,
    pincode: address.pin_code,
    address_type: address.address_type,
  };
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  const auth = await resolveSupabaseRequestAuth(request);
  if (!auth.configured) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (auth.invalidBearer || !auth.client || !auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const clientId = getCashfreeClientId();
  const clientSecret = getCashfreeClientSecret();
  if (!clientId || !clientSecret) return NextResponse.json({ error: "Cashfree is not configured." }, { status: 503 });
  const serverEnvironment = getCashfreeEnvironment();
  const browserEnvironment = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT?.trim();
  if (browserEnvironment && browserEnvironment !== serverEnvironment) return NextResponse.json({ error: "Cashfree environment configuration is inconsistent." }, { status: 503 });

  let body: CreateCashfreeOrderBody = {};
  try {
    body = (await request.json()) as CreateCashfreeOrderBody;
  } catch {
    body = {};
  }

  const couponCode = typeof body.couponCode === "string" && body.couponCode.trim() ? body.couponCode.trim() : null;
  const { data: pricingData, error: pricingError } = await auth.client.rpc("calculate_checkout_pricing", { p_coupon_code: couponCode });
  if (pricingError) return NextResponse.json({ error: pricingError.message ?? "Unable to calculate checkout totals." }, { status: 400 });

  const pricing = Array.isArray(pricingData) ? pricingData[0] : pricingData;
  const amount = Math.round(toNumber((pricing as Record<string, unknown> | null)?.total_amount) * 100) / 100;
  if (!pricing || amount < 1) return NextResponse.json({ error: "Checkout amount must be at least ₹1." }, { status: 400 });

  const requestId = getRequestId(body.requestId);
  const orderId = `us_${auth.user.id.slice(0, 8)}_${requestId.replace(/-/g, "").slice(0, 24)}`;
  const { data: cartRows, error: cartError } = await auth.client
    .from("cart_items")
    .select("*")
    .eq("user_id", auth.user.id)
    .is("deleted_at", null);
  if (cartError) return NextResponse.json({ error: cartError.message ?? "Unable to capture checkout context." }, { status: 400 });

  const pricingSnapshot = {
    ...(pricing as Record<string, unknown>),
    currency: "INR",
    total_amount: amount,
  };
  const cartSnapshot = {
    cart_rows: cartRows ?? [],
    line_items: ((pricing as Record<string, unknown>).line_items ?? []) as Json,
  };
  const shippingAddressId = typeof body.shippingAddressId === "string" ? body.shippingAddressId.trim() : "";
  const billingAddressId = typeof body.billingAddressId === "string" && body.billingAddressId.trim() ? body.billingAddressId.trim() : shippingAddressId;
  if (!shippingAddressId || !billingAddressId) return NextResponse.json({ error: "A valid delivery address is required." }, { status: 400 });
  const { data: addressRows, error: addressError } = await auth.client
    .from("addresses")
    .select("id, full_name, phone, line1, line2, landmark, area, city, state, country, pin_code, address_type")
    .eq("user_id", auth.user.id)
    .is("deleted_at", null)
    .in("id", [...new Set([shippingAddressId, billingAddressId])]);
  if (addressError) return NextResponse.json({ error: addressError.message ?? "Unable to load the delivery address." }, { status: 400 });
  const typedAddresses = (addressRows ?? []) as AddressRow[];
  const shippingAddress = typedAddresses.find((address) => address.id === shippingAddressId);
  const billingAddress = typedAddresses.find((address) => address.id === billingAddressId);
  if (!shippingAddress || !billingAddress) return NextResponse.json({ error: "The selected delivery address is no longer available." }, { status: 400 });

  const { data: profile } = await auth.client.from("profiles").select("full_name, email, phone").eq("id", auth.user.id).maybeSingle();
  const profileRow = profile as { full_name?: string | null; email?: string | null; phone?: string | null } | null;
  const customerName = profileRow?.full_name?.trim() || auth.user.user_metadata?.full_name || auth.user.user_metadata?.name || shippingAddress.full_name || "UniqueShopee Customer";
  const customerEmail = profileRow?.email?.trim() || auth.user.email?.trim() || "";
  const customerPhone = profileRow?.phone?.trim() || auth.user.phone?.trim() || shippingAddress.phone.trim();
  if (!customerEmail || !customerPhone) return NextResponse.json({ error: "Please add your phone number before continuing with online payment." }, { status: 400 });

  const shippingAddressSnapshot = buildAddressSnapshot(shippingAddress);
  const billingAddressSnapshot = buildAddressSnapshot(billingAddress);
  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  const checkoutGroupId = getCheckoutGroupId({
    userId: auth.user.id,
    cartRows: [...(cartRows ?? [])].sort((left, right) => String((left as { id?: unknown }).id ?? "").localeCompare(String((right as { id?: unknown }).id ?? ""))),
    pricingSnapshot,
    shippingAddressId,
    billingAddressId,
    shippingAddressSnapshot,
    billingAddressSnapshot,
    shippingSelection: {
      strategy: "resolve_checkout_shipping",
      shippingTotal: (pricing as Record<string, unknown>).shipping_total ?? null,
      taxableAmount: (pricing as Record<string, unknown>).taxable_amount ?? null,
    },
    couponCode,
    notes,
  });
  const environment = getSupabaseEnvironment();
  if (!environment?.serviceRoleKey) return NextResponse.json({ error: "Payment intent creation is not configured." }, { status: 503 });
  const admin = createClient<Database>(environment.url, environment.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: intentData, error: intentError } = await admin.rpc("create_payment_intent", {
    p_provider: "Cashfree",
    p_provider_order_id: orderId,
    p_amount: amount,
    p_currency: "INR",
    p_payment_method: "Cashfree",
    p_idempotency_key: requestId,
    p_checkout_group_id: checkoutGroupId,
    p_cart_snapshot: cartSnapshot as unknown as Json,
    p_pricing_snapshot: pricingSnapshot as unknown as Json,
    p_shipping_address_id: shippingAddressId,
    p_billing_address_id: billingAddressId,
    p_shipping_address_snapshot: shippingAddressSnapshot as unknown as Json,
    p_billing_address_snapshot: billingAddressSnapshot as unknown as Json,
    p_coupon_code: couponCode,
    p_notes: notes,
    p_actor_user_id: auth.user.id,
  });
  if (intentError) return NextResponse.json({ error: intentError.message ?? "Unable to create payment intent." }, { status: 400 });

  const intent = Array.isArray(intentData) ? intentData[0] : intentData;
  const paymentIntentId = (intent as { payment_intent_id?: string } | null)?.payment_intent_id;
  const providerOrderId = (intent as { provider_order_id?: string } | null)?.provider_order_id ?? orderId;
  if (!paymentIntentId || !providerOrderId) return NextResponse.json({ error: "Unable to create payment intent." }, { status: 400 });

  const response = await fetchWithTimeout(`${getCashfreeApiBaseUrl()}/orders`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-api-version": getCashfreeApiVersion(),
      "x-client-id": clientId,
      "x-client-secret": clientSecret,
      "x-idempotency-key": requestId,
    },
    body: JSON.stringify({
      order_id: providerOrderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: auth.user.id,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/checkout?cashfree_order_id=${encodeURIComponent(providerOrderId)}&payment_intent_id=${encodeURIComponent(paymentIntentId)}`,
      },
      order_note: `UniqueShopee checkout${couponCode ? ` coupon ${couponCode}` : ""}`,
      order_tags: {
        user_id: auth.user.id,
        coupon_code: couponCode ?? "",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ error: `Cashfree order creation failed: ${errorText || response.statusText}` }, { status: 502 });
  }

  const cashfreeOrder = (await response.json()) as {
    order_id?: string;
    order_amount?: number;
    order_currency?: string;
    payment_session_id?: string;
  };
  if (!cashfreeOrder.order_id || !cashfreeOrder.payment_session_id) {
    return NextResponse.json({ error: "Cashfree did not return a payment session." }, { status: 502 });
  }

  return NextResponse.json({
    cashfreeOrderId: cashfreeOrder.order_id,
    paymentIntentId,
    paymentSessionId: cashfreeOrder.payment_session_id,
    amount: cashfreeOrder.order_amount ?? amount,
    currency: cashfreeOrder.order_currency ?? "INR",
    mode: serverEnvironment,
    customer: { name: customerName, email: customerEmail, contact: customerPhone },
  });
}
