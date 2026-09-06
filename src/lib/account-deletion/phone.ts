import "server-only";

import { sendOTP, verifyOTP } from "@/lib/2factor";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { normalizePhoneNumber } from "@/lib/phone-auth";

const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_ATTEMPTS = 5;

type DeletionChallenge = {
  id: string;
  phone: string;
  provider_session_id: string;
  status: "pending" | "verified" | "expired" | "locked" | "consumed";
  attempts: number;
  max_attempts: number;
  sent_at: string;
  expires_at: string;
  locked_at?: string | null;
};

function getPhoneForUser(user: { id: string; phone?: string | null; identities?: Array<{ provider: string }> | null }) {
  const isPhoneIdentity = user.identities?.some((identity) => identity.provider === "phone") === true;
  if (!isPhoneIdentity) return null;
  return normalizePhoneNumber(user.phone ?? "") || null;
}

export async function createPhoneDeletionChallenge(user: { id: string; phone?: string | null; identities?: Array<{ provider: string }> | null }) {
  const client = getSupabaseServiceRoleClient();
  const phone = getPhoneForUser(user);
  if (!client || !phone) {
    return { challengeId: null, expiresAt: null, maskedPhone: null, error: "Phone account deletion is unavailable." } as const;
  }

  const cutoff = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000).toISOString();
  const { data: recentData } = await client
    .from("account_deletion_phone_challenges")
    .select("id, sent_at, status, expires_at, locked_at")
    .eq("auth_user_id", user.id)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const recent = recentData as unknown as Pick<DeletionChallenge, "sent_at" | "status" | "locked_at"> | null;

  if (recent?.status === "locked" && recent.locked_at && new Date(recent.locked_at).getTime() > Date.now()) {
    return { challengeId: null, expiresAt: null, maskedPhone: null, error: "Too many verification attempts. Try again later." } as const;
  }
  if (recent?.sent_at && recent.sent_at > cutoff) {
    return { challengeId: null, expiresAt: null, maskedPhone: null, error: "Please wait before requesting another code." } as const;
  }

  await client
    .from("account_deletion_phone_challenges")
    .update({ status: "expired" })
    .eq("auth_user_id", user.id)
    .eq("status", "pending");

  const sent = await sendOTP(phone);
  if (!sent.ok || !sent.sessionId) {
    return { challengeId: null, expiresAt: null, maskedPhone: null, error: "Unable to send the deletion verification code." } as const;
  }

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
  const { data, error } = await client
    .from("account_deletion_phone_challenges")
    .insert({
      auth_user_id: user.id,
      phone,
      provider_session_id: sent.sessionId,
      status: "pending",
      attempts: 0,
      max_attempts: MAX_ATTEMPTS,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  const inserted = data as unknown as { id: string } | null;
  if (error || !inserted?.id) {
    return { challengeId: null, expiresAt: null, maskedPhone: null, error: "Unable to create the deletion challenge." } as const;
  }

  return {
    challengeId: inserted.id,
    expiresAt,
    maskedPhone: `${phone.slice(0, 3)}••••${phone.slice(-3)}`,
    error: null,
  } as const;
}

export async function verifyPhoneDeletionChallenge(
  user: { id: string; phone?: string | null; identities?: Array<{ provider: string }> | null },
  challengeId: string,
  otp: string,
) {
  const client = getSupabaseServiceRoleClient();
  const phone = getPhoneForUser(user);
  if (!client || !phone || !challengeId || !otp || otp.length > 32) {
    return { verified: false, error: "Deletion verification failed." } as const;
  }

  const { data: challengeData } = await client
    .from("account_deletion_phone_challenges")
    .select("id, phone, provider_session_id, status, attempts, max_attempts, expires_at")
    .eq("id", challengeId)
    .eq("auth_user_id", user.id)
    .eq("phone", phone)
    .maybeSingle();
  const challenge = challengeData as unknown as DeletionChallenge | null;

  if (!challenge) return { verified: false, error: "Deletion verification failed." } as const;
  if (challenge.status === "verified" || challenge.status === "consumed") return { verified: false, error: "This deletion code has already been used." } as const;
  if (challenge.status === "locked") return { verified: false, error: "Too many verification attempts. Try again later." } as const;
  if (!challenge.expires_at || new Date(challenge.expires_at).getTime() <= Date.now()) {
    await client.from("account_deletion_phone_challenges").update({ status: "expired" }).eq("id", challenge.id).eq("status", "pending");
    return { verified: false, error: "The deletion code has expired." } as const;
  }

  const attempt = Number(challenge.attempts ?? 0) + 1;
  const verification = await verifyOTP(challenge.provider_session_id, otp);
  if (!verification.ok || !verification.matched) {
    const locked = attempt >= Number(challenge.max_attempts ?? MAX_ATTEMPTS);
    await client
      .from("account_deletion_phone_challenges")
      .update({
        attempts: attempt,
        status: locked ? "locked" : "pending",
        locked_at: locked ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null,
      })
      .eq("id", challenge.id)
      .eq("status", "pending");
    return { verified: false, error: locked ? "Too many verification attempts. Try again later." : "Invalid deletion code." } as const;
  }

  const { data: consumed } = await client
    .from("account_deletion_phone_challenges")
    .update({ status: "verified", verified_at: new Date().toISOString(), attempts: attempt })
    .eq("id", challenge.id)
    .eq("auth_user_id", user.id)
    .eq("phone", phone)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  return consumed ? { verified: true, error: null } as const : { verified: false, error: "Deletion verification failed." } as const;
}

export async function consumePhoneDeletionChallenge(userId: string, challengeId: string) {
  const client = getSupabaseServiceRoleClient();
  if (!client) return false;
  const { data } = await client
    .from("account_deletion_phone_challenges")
    .update({ status: "consumed", consumed_at: new Date().toISOString() })
    .eq("id", challengeId)
    .eq("auth_user_id", userId)
    .eq("status", "verified")
    .gt("verified_at", new Date(Date.now() - OTP_EXPIRY_MINUTES * 60 * 1000).toISOString())
    .select("id")
    .maybeSingle();
  return !!data;
}
