import { NextResponse } from "next/server";
import { resolveSupabaseRequestAuth } from "@/lib/supabase/server";
import { getRazorpayPublicKeyId, getRazorpaySecretKey } from "@/lib/razorpay-config";

export const runtime = "nodejs";

type CreateRazorpayOrderBody = {
  couponCode?: string | null;
};

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
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

  const keyId = getRazorpayPublicKeyId();
  const keySecret = getRazorpaySecretKey();
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay is not configured." }, { status: 503 });
  }

  let body: CreateRazorpayOrderBody = {};
  try {
    body = (await request.json()) as CreateRazorpayOrderBody;
  } catch {
    body = {};
  }

  const couponCode = typeof body.couponCode === "string" && body.couponCode.trim().length > 0 ? body.couponCode.trim() : null;
  const { data: pricingData, error: pricingError } = await client.rpc("calculate_checkout_pricing", {
    p_coupon_code: couponCode,
  });

  if (pricingError) {
    return NextResponse.json({ error: pricingError.message ?? "Unable to calculate checkout totals." }, { status: 400 });
  }

  const pricing = Array.isArray(pricingData) ? pricingData[0] : pricingData;
  if (!pricing) {
    return NextResponse.json({ error: "Unable to prepare Razorpay order." }, { status: 400 });
  }

  const amount = Math.max(0, Math.round(toNumber((pricing as Record<string, unknown>).total_amount) * 100));
  if (amount <= 0) {
    return NextResponse.json({ error: "Checkout amount must be greater than zero." }, { status: 400 });
  }

  const { data: profile } = await client
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .maybeSingle();

  const contactPhone = (profile as { phone?: string | null } | null)?.phone ?? user.phone ?? "";
  const fullName = (profile as { full_name?: string | null } | null)?.full_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? "UniqueShopee Customer";
  const email = (profile as { email?: string | null } | null)?.email ?? user.email ?? "";

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: `us-${user.id.slice(0, 8)}-${Date.now()}`,
      notes: {
        user_id: user.id,
        coupon_code: couponCode ?? "",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `Razorpay order creation failed: ${errorText || response.statusText}` },
      { status: 502 },
    );
  }

  const razorpayOrder = (await response.json()) as {
    id: string;
    amount: number;
    currency: string;
    receipt?: string;
    status?: string;
  };

  return NextResponse.json({
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId,
    receipt: razorpayOrder.receipt ?? null,
    customer: {
      name: fullName,
      email,
      contact: contactPhone,
    },
  });
}
