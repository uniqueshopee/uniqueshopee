import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getCashfreeApiBaseUrl,
  getCashfreeApiVersion,
  getCashfreeClientId,
  getCashfreeClientSecret,
} from "@/lib/cashfree-config";
import { getSupabaseEnvironment } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

async function cashfreeRequest(path: string, clientId: string, clientSecret: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(`${getCashfreeApiBaseUrl()}${path}`, {
      headers: {
        Accept: "application/json",
        "x-api-version": getCashfreeApiVersion(),
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function money(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : -1;
}

export async function POST(request: Request) {
  const secret = getCashfreeClientSecret();
  const clientId = getCashfreeClientId();
  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");
  const version = request.headers.get("x-webhook-version");
  const rawBody = await request.text();

  if (!secret || !clientId || !signature || !timestamp || !version) return NextResponse.json({ error: "Invalid Cashfree webhook headers." }, { status: 400 });
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() - timestampNumber) > 5 * 60 * 1000) return NextResponse.json({ error: "Expired Cashfree webhook." }, { status: 400 });
  const expectedSignature = crypto.createHmac("sha256", secret).update(timestamp + rawBody, "utf8").digest("base64");
  if (!safeEqual(expectedSignature, signature)) return NextResponse.json({ error: "Invalid Cashfree webhook signature." }, { status: 400 });

  let payload: {
    data?: {
      order?: { order_id?: string };
      payment?: { cf_payment_id?: string | number; payment_status?: string };
    };
  };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid Cashfree webhook JSON." }, { status: 400 });
  }

  const providerOrderId = payload.data?.order?.order_id;
  const webhookPaymentId = payload.data?.payment?.cf_payment_id ? String(payload.data.payment.cf_payment_id) : "";
  const webhookStatus = payload.data?.payment?.payment_status ?? "";
  if (!providerOrderId || !webhookStatus) return NextResponse.json({ error: "Incomplete Cashfree webhook event." }, { status: 400 });

  const environment = getSupabaseEnvironment();
  if (!environment?.serviceRoleKey) return NextResponse.json({ error: "Payment reconciliation is not configured." }, { status: 503 });
  const admin = createClient<Database>(environment.url, environment.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: intent, error: intentError } = await admin
    .from("payment_intents")
    .select("id, user_id, provider, provider_order_id, provider_payment_id, amount, currency, payment_method, status, finalized_order_id")
    .eq("provider", "Cashfree")
    .eq("provider_order_id", providerOrderId)
    .maybeSingle();
  if (intentError) return NextResponse.json({ error: "Unable to load payment intent." }, { status: 503 });
  if (!intent) return NextResponse.json({ error: "Payment intent not found." }, { status: 409 });
  if (webhookStatus === "SUCCESS" && webhookPaymentId && intent.provider_payment_id && webhookPaymentId !== intent.provider_payment_id) return NextResponse.json({ error: "Cashfree payment identity mismatch." }, { status: 400 });

  if (["FAILED", "CANCELLED", "USER_DROPPED"].includes(webhookStatus)) {
    const { error } = await admin.rpc("update_payment_intent_status", {
      p_payment_intent_id: intent.id,
      p_provider_order_id: providerOrderId,
      p_provider_payment_id: webhookPaymentId || null,
      p_status: "failed",
      p_failure_message: webhookStatus,
      p_actor_user_id: intent.user_id,
    });
    if (error) return NextResponse.json({ error: "Unable to record payment failure." }, { status: 503 });
    return NextResponse.json({ received: true, reconciled: true }, { status: 200 });
  }

  if (webhookStatus !== "SUCCESS") {
    const { error } = await admin.rpc("update_payment_intent_status", {
      p_payment_intent_id: intent.id,
      p_provider_order_id: providerOrderId,
      p_provider_payment_id: webhookPaymentId || null,
      p_status: "pending",
      p_failure_message: null,
      p_actor_user_id: intent.user_id,
    });
    if (error) return NextResponse.json({ error: "Unable to record payment state." }, { status: 503 });
    return NextResponse.json({ received: true, reconciled: true }, { status: 200 });
  }

  const orderResponse = await cashfreeRequest(`/orders/${encodeURIComponent(providerOrderId)}`, clientId, secret);
  if (!orderResponse.ok) return NextResponse.json({ error: "Unable to verify Cashfree order." }, { status: 503 });
  const order = (await orderResponse.json()) as { order_id?: string; order_amount?: number; order_currency?: string; customer_details?: { customer_id?: string } };
  if (order.order_id !== providerOrderId || order.customer_details?.customer_id !== intent.user_id || money(order.order_amount) !== money(intent.amount) || order.order_currency?.toUpperCase() !== String(intent.currency).toUpperCase()) {
    return NextResponse.json({ error: "Cashfree order reconciliation failed." }, { status: 400 });
  }

  const paymentsResponse = await cashfreeRequest(`/orders/${encodeURIComponent(providerOrderId)}/payments`, clientId, secret);
  if (!paymentsResponse.ok) return NextResponse.json({ error: "Unable to verify Cashfree payment." }, { status: 503 });
  const payments = (await paymentsResponse.json()) as Array<{ cf_payment_id?: string | number; payment_status?: string; payment_amount?: number; payment_currency?: string }>;
  const payment = payments.find((item) => String(item.cf_payment_id ?? "") === webhookPaymentId && item.payment_status === "SUCCESS");
  if (!payment || money(payment.payment_amount) !== money(intent.amount) || payment.payment_currency?.toUpperCase() !== String(intent.currency).toUpperCase()) return NextResponse.json({ error: "Cashfree payment reconciliation failed." }, { status: 400 });

  const { data, error } = await admin.rpc("finalize_payment_intent", {
    p_payment_intent_id: intent.id,
    p_provider_order_id: providerOrderId,
    p_provider_payment_id: webhookPaymentId,
    p_provider_amount: order.order_amount,
    p_provider_currency: order.order_currency ?? "INR",
    p_payment_method: "Cashfree",
    p_actor_user_id: intent.user_id,
  });
  if (error) return NextResponse.json({ error: "Unable to finalize payment intent." }, { status: 503 });
  return NextResponse.json({ received: true, reconciled: true, order: Array.isArray(data) ? data[0] : data }, { status: 200 });
}
