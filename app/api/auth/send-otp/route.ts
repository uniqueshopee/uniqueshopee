import { NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { sendOTP } from "@/lib/2factor";
import type { Json } from "@/lib/supabase/types";
import { normalizePhoneNumber } from "@/lib/phone-auth";
import { UI_MESSAGES, getApiErrorMessage } from "@/lib/messages";

export const runtime = "nodejs";

type SendOtpBody = {
  phone?: string | null;
  purpose?: "login" | "signup" | null;
  fullName?: string | null;
  email?: string | null;
};

const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 30;

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getServiceRoleClient() {
  const client = getSupabaseServiceRoleClient();
  if (!client) {
    return null;
  }

  return client;
}

async function pruneExpiredChallenges(client: NonNullable<ReturnType<typeof getServiceRoleClient>>) {
  const nowIso = new Date().toISOString();

  await client
    .from("phone_verifications")
    .update({
      status: "expired",
    })
    .eq("status", "pending")
    .lt("expires_at", nowIso)
    .is("deleted_at", null);
}

export async function POST(request: Request) {
  const serviceRoleClient = getServiceRoleClient();

  if (!serviceRoleClient) {
    return NextResponse.json({ error: UI_MESSAGES.generic.server }, { status: 503 });
  }

  let body: SendOtpBody = {};
  try {
    body = (await request.json()) as SendOtpBody;
  } catch {
    body = {};
  }

  const normalizedPhone = normalizePhoneNumber(asTrimmedString(body.phone));
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });
  }

  const purpose = body.purpose === "signup" ? "signup" : "login";
  const fullName = asTrimmedString(body.fullName);
  const email = asTrimmedString(body.email);

  await pruneExpiredChallenges(serviceRoleClient);

  const cutoff = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000).toISOString();
  const { data: recentChallenge } = await serviceRoleClient
    .from("phone_verifications")
    .select("id, session_id, sent_at, status, expires_at, locked_until")
    .eq("phone", normalizedPhone)
    .eq("purpose", purpose)
    .is("deleted_at", null)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lockedUntil = recentChallenge ? asTrimmedString(recentChallenge.locked_until) : "";
  if (recentChallenge?.status === "locked" && lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
    return NextResponse.json(
      {
        error: UI_MESSAGES.auth.tooManyAttempts,
      },
      { status: 429 },
    );
  }

  if (recentChallenge && typeof recentChallenge.sent_at === "string" && recentChallenge.sent_at > cutoff) {
    return NextResponse.json(
      {
        error: UI_MESSAGES.auth.tooManyAttempts,
      },
      { status: 429 },
    );
  }

  if (recentChallenge && typeof recentChallenge.session_id === "string") {
    await serviceRoleClient
      .from("phone_verifications")
      .update({
        status: "expired",
        locked_at: new Date().toISOString(),
      })
      .eq("session_id", recentChallenge.session_id)
      .eq("status", "pending");
  }

  const sendResult = await sendOTP(normalizedPhone);
  if (!sendResult.ok || !sendResult.sessionId) {
    console.error("OTP send failed");
    return NextResponse.json(
      {
        error: UI_MESSAGES.auth.loginFailed,
      },
      { status: sendResult.status >= 400 ? sendResult.status : 502 },
    );
  }

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
  const metadata = {
    full_name: fullName || null,
    email: email || null,
  };

  const { error } = await serviceRoleClient.from("phone_verifications").insert({
    phone: normalizedPhone,
    purpose,
    session_id: sendResult.sessionId,
    status: "pending",
    attempts: 0,
    max_attempts: 5,
    sent_at: new Date().toISOString(),
    expires_at: expiresAt,
    metadata: metadata as unknown as Json,
  });

  if (error) {
    console.error("Unable to prepare OTP challenge");
    return NextResponse.json(
      {
        error: getApiErrorMessage(error, UI_MESSAGES.generic.server),
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    phone: normalizedPhone,
    challengeId: sendResult.sessionId,
    expiresAt,
  });
}
