import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveSupabaseRequestAuth } from "@/lib/supabase/server";
import {
  getCashfreeApiBaseUrl,
  getCashfreeApiVersion,
  getCashfreeClientId,
  getCashfreeClientSecret,
} from "@/lib/cashfree-config";
import { getSupabaseEnvironment } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

type VerifyCashfreePaymentBody = {
  paymentIntentId?: string;
  cashfreeOrderId?: string;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
  const auth = await resolveSupabaseRequestAuth(request);
  if (!auth.configured) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (auth.invalidBearer || !auth.client || !auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const clientId = getCashfreeClientId();
  const clientSecret = getCashfreeClientSecret();
  if (!clientId || !clientSecret) return NextResponse.json({ error: "Cashfree is not configured." }, { status: 503 });

  let body: VerifyCashfreePaymentBody = {};
  try {
    body = (await request.json()) as VerifyCashfreePaymentBody;
  } catch {
    body = {};
  }

  const paymentIntentId = asText(body.paymentIntentId);
  const cashfreeOrderId = asText(body.cashfreeOrderId);
  if (!paymentIntentId || !cashfreeOrderId) return NextResponse.json({ error: "Missing Cashfree payment intent or order ID." }, { status: 400 });

  const { data: intent, error: intentError } = await auth.client
    .from("payment_intents")
    .select("id, user_id, provider, provider_order_id, amount, currency, payment_method, status, finalized_order_id")
    .eq("id", paymentIntentId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (intentError || !intent) return NextResponse.json({ error: "Payment intent not found." }, { status: 404 });
  if (intent.provider !== "Cashfree" || intent.provider_order_id !== cashfreeOrderId || intent.payment_method !== "Cashfree") {
    return NextResponse.json({ error: "Cashfree payment intent does not match the order." }, { status: 400 });
  }
  if (intent.finalized_order_id) return NextResponse.json({ orderId: intent.finalized_order_id, alreadyCreated: true });

  const orderResponse = await cashfreeRequest(`/orders/${encodeURIComponent(cashfreeOrderId)}`, clientId, clientSecret);
  if (!orderResponse.ok) return NextResponse.json({ error: "Unable to verify Cashfree order." }, { status: 502 });
  const cashfreeOrder = (await orderResponse.json()) as {
    order_id?: string;
    order_amount?: number;
    order_currency?: string;
    order_status?: string;
    customer_details?: { customer_id?: string };
  };
  if (cashfreeOrder.order_id !== cashfreeOrderId || cashfreeOrder.customer_details?.customer_id !== auth.user.id) {
    return NextResponse.json({ error: "Cashfree order identity verification failed." }, { status: 400 });
  }
  if (money(cashfreeOrder.order_amount) !== money(intent.amount) || cashfreeOrder.order_currency?.toUpperCase() !== String(intent.currency).toUpperCase()) {
    return NextResponse.json({ error: "Cashfree order amount or currency mismatch." }, { status: 409 });
  }

  const paymentsResponse = await cashfreeRequest(`/orders/${encodeURIComponent(cashfreeOrderId)}/payments`, clientId, clientSecret);
  if (!paymentsResponse.ok) return NextResponse.json({ error: "Unable to verify Cashfree payment." }, { status: 502 });
  const payments = (await paymentsResponse.json()) as Array<{
    cf_payment_id?: string | number;
    payment_status?: string;
    payment_amount?: number;
    payment_currency?: string;
  }>;
  const successfulPayment = payments.find((payment) => payment.payment_status === "SUCCESS");
  if (!successfulPayment || !successfulPayment.cf_payment_id || money(successfulPayment.payment_amount) !== money(intent.amount) || successfulPayment.payment_currency?.toUpperCase() !== String(intent.currency).toUpperCase()) {
    const pending = ["ACTIVE", "PENDING"].includes(cashfreeOrder.order_status ?? "") || payments.some((payment) => ["PENDING", "NOT_ATTEMPTED"].includes(payment.payment_status ?? ""));
    return NextResponse.json({ error: pending ? "Payment is still pending. Please retry verification." : "Cashfree payment was not successful." }, { status: 409 });
  }

  const environment = getSupabaseEnvironment();
  if (!environment?.serviceRoleKey) return NextResponse.json({ error: "Payment finalization is not configured." }, { status: 503 });
  const admin = createClient<Database>(environment.url, environment.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: finalizationData, error: finalizationError } = await admin.rpc("finalize_payment_intent", {
    p_payment_intent_id: paymentIntentId,
    p_provider_order_id: cashfreeOrderId,
    p_provider_payment_id: String(successfulPayment.cf_payment_id),
    p_provider_amount: cashfreeOrder.order_amount,
    p_provider_currency: cashfreeOrder.order_currency ?? "INR",
    p_payment_method: "Cashfree",
    p_actor_user_id: auth.user.id,
  });
  if (finalizationError) return NextResponse.json({ error: finalizationError.message ?? "Unable to finalize checkout. Please retry verification." }, { status: 502 });

  const result = Array.isArray(finalizationData) ? finalizationData[0] : finalizationData;
  if (!result || typeof (result as { order_id?: unknown }).order_id !== "string") return NextResponse.json({ error: "Unable to finalize checkout. Please retry verification." }, { status: 502 });
  return NextResponse.json({ orderId: (result as { order_id: string }).order_id, orderNumber: (result as { order_number?: string }).order_number ?? null, alreadyCreated: Boolean((result as { already_finalized?: boolean }).already_finalized) });
}
