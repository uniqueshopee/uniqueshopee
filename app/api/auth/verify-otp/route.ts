import { NextResponse } from "next/server";
import { verifyOTP } from "@/lib/2factor";
import { normalizePhoneNumber } from "@/lib/phone-auth";
import { decryptPhonePassword, encryptPhonePassword, generateSecurePhonePassword } from "@/lib/phone-auth-credentials";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicServerClient } from "@/lib/supabase/public-server";
import type { AuthRoleKey } from "@/lib/supabase/auth";
import { resolvePostAuthPath } from "@/lib/auth/redirect";
import { UI_MESSAGES, getApiErrorMessage } from "@/lib/messages";

export const runtime = "nodejs";

type VerifyOtpBody = {
  phone?: string | null;
  otp?: string | null;
  challengeId?: string | null;
  purpose?: "login" | "signup" | null;
  fullName?: string | null;
  email?: string | null;
};

type CredentialRow = {
  phone: string;
  user_id: string;
  encrypted_password: string;
  encryption_iv: string;
  encryption_tag: string;
};

type ExistingPhoneUserLookup = {
  userId: string | null;
  error: string | null;
};

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeComparablePhone(value: string) {
  const normalized = normalizePhoneNumber(asTrimmedString(value));
  return normalized || asTrimmedString(value).replace(/\s+/g, "");
}

function phonesMatch(left: string, right: string) {
  return normalizeComparablePhone(left) === normalizeComparablePhone(right);
}

function isDuplicateError(error: { code?: string | null; message?: string | null } | null | undefined) {
  return error?.code === "23505" || /duplicate/i.test(error?.message ?? "");
}

async function loadLatestChallenge(adminClient: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, phone: string, challengeId: string) {
  const { data, error } = await adminClient
    .from("phone_verifications")
    .select("id, phone, purpose, session_id, status, attempts, max_attempts, expires_at, metadata, sent_at")
    .eq("session_id", challengeId)
    .eq("phone", phone)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("Failed to load latest OTP challenge");
    }
    return null;
  }

  return data;
}

async function loadPhoneCredential(adminClient: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, phone: string) {
  const { data, error } = await adminClient
    .from("phone_auth_credentials")
    .select("phone, user_id, encrypted_password, encryption_iv, encryption_tag")
    .eq("phone", phone)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("Failed to load phone credential");
    }
    return null;
  }

  return data as CredentialRow;
}

async function getExistingPhoneUserId(
  adminClient: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  phone: string,
): Promise<ExistingPhoneUserLookup> {
  const credential = await loadPhoneCredential(adminClient, phone);
  if (credential?.user_id && phonesMatch(credential.phone, phone)) {
    return { userId: credential.user_id, error: null };
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, phone")
    .eq("phone", phone)
    .is("deleted_at", null)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to look up phone profile");
    return { userId: null, error: UI_MESSAGES.generic.server };
  }

  const profilePhone = asTrimmedString(profile?.phone);
  if (profile?.id && profilePhone && phonesMatch(profilePhone, phone)) {
    return { userId: asTrimmedString(profile.id), error: null };
  }

  const pageSize = 1000;
  let page = 1;

  while (page <= 100) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: pageSize });
    if (error) {
      console.error("Failed to list auth users");
      return { userId: null, error: UI_MESSAGES.generic.server };
    }

    if (!data?.users?.length) {
      return { userId: null, error: null };
    }

    const matchingUser = data.users.find((item) => item.phone === phone);
    const matchingNormalizedUser = data.users.find((item) => item.phone && phonesMatch(item.phone, phone));
    if (matchingNormalizedUser?.id) {
      return { userId: matchingNormalizedUser.id, error: null };
    }

    if (matchingUser?.id) {
      return { userId: matchingUser.id, error: null };
    }

    if (typeof data.nextPage === "number" && data.nextPage > page) {
      page = data.nextPage;
      continue;
    }

    if (data.users.length < pageSize) {
      break;
    }

    page += 1;
  }

  return { userId: null, error: null };
}

async function ensurePhoneAuthIdentity(
  adminClient: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  phone: string,
  metadata: Record<string, unknown>,
) {
  const existingCredential = await loadPhoneCredential(adminClient, phone);
  const existingUserLookup = await getExistingPhoneUserId(adminClient, phone);
  if (existingUserLookup.error) {
    return { error: existingUserLookup.error, userId: null as string | null, password: null as string | null };
  }

  let resolvedUserId = existingUserLookup.userId;
  let password = existingCredential
    ? decryptPhonePassword({
        ciphertext: existingCredential.encrypted_password,
        iv: existingCredential.encryption_iv,
        tag: existingCredential.encryption_tag,
      })
    : generateSecurePhonePassword();

  if (!password) {
    return { error: UI_MESSAGES.generic.server, userId: null as string | null, password: null as string | null };
  }

  if (!resolvedUserId) {
    const createResult = await adminClient.auth.admin.createUser({
      phone,
      phone_confirm: true,
      password,
      user_metadata: metadata,
    });

    if (createResult.error || !createResult.data.user) {
      if (createResult.error) {
        console.error("Failed to create phone auth user");
      }
      const retryLookup = await getExistingPhoneUserId(adminClient, phone);
      if (retryLookup.error) {
        return {
          error: retryLookup.error,
          userId: null as string | null,
          password: null as string | null,
        };
      }

      resolvedUserId = retryLookup.userId;
      if (!resolvedUserId) {
        return {
          error:
            isDuplicateError(createResult.error) || /already registered/i.test(createResult.error?.message ?? "")
              ? UI_MESSAGES.auth.phoneAlreadyRegistered
              : getApiErrorMessage(createResult.error, UI_MESSAGES.generic.server),
          userId: null as string | null,
          password: null as string | null,
        };
      }
    } else {
      resolvedUserId = createResult.data.user.id;
    }
  }

  if (!existingCredential) {
    const encryptedPassword = encryptPhonePassword(password);
    if (!encryptedPassword) {
      return { error: UI_MESSAGES.generic.server, userId: null as string | null, password: null as string | null };
    }

    if (!resolvedUserId) {
      return { error: UI_MESSAGES.generic.server, userId: null as string | null, password: null as string | null };
    }

    const credentialInsert = await adminClient.from("phone_auth_credentials").insert({
      phone,
      user_id: resolvedUserId,
      encrypted_password: encryptedPassword.ciphertext,
      encryption_iv: encryptedPassword.iv,
      encryption_tag: encryptedPassword.tag,
    });

    if (credentialInsert.error && !isDuplicateError(credentialInsert.error)) {
      console.error("Failed to store phone credentials");
      return {
        error: getApiErrorMessage(credentialInsert.error, UI_MESSAGES.generic.server),
        userId: null as string | null,
        password: null as string | null,
      };
    }

    const storedCredential = await loadPhoneCredential(adminClient, phone);
    if (storedCredential) {
      const storedPassword = decryptPhonePassword({
        ciphertext: storedCredential.encrypted_password,
        iv: storedCredential.encryption_iv,
        tag: storedCredential.encryption_tag,
      });

      if (!storedPassword) {
        return { error: UI_MESSAGES.generic.server, userId: null as string | null, password: null as string | null };
      }

      password = storedPassword;
    }
  }

  if (!resolvedUserId) {
    return { error: UI_MESSAGES.generic.server, userId: null as string | null, password: null as string | null };
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(resolvedUserId, {
    phone,
    phone_confirm: true,
    password,
    user_metadata: metadata,
  });

  if (updateError) {
    console.error("Failed to update phone auth user");
    return { error: getApiErrorMessage(updateError, UI_MESSAGES.generic.server), userId: null as string | null, password: null as string | null };
  }

  return { error: null, userId: resolvedUserId, password };
}

async function consumeChallenge(
  adminClient: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  challengeId: string,
  challengeRowId: string,
  currentAttempts: number,
) {
  const nowIso = new Date().toISOString();

  const { data, error } = await adminClient
    .from("phone_verifications")
    .update({
      status: "verified",
      verified_at: nowIso,
      attempts: currentAttempts + 1,
    })
    .eq("id", challengeRowId)
    .eq("session_id", challengeId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  return !error && !!data;
}

async function markFailedAttempt(
  adminClient: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  challengeRowId: string,
  currentAttempts: number,
  maxAttempts: number,
) {
  const nextAttempts = currentAttempts + 1;
  const nowIso = new Date().toISOString();
  const locked = nextAttempts >= maxAttempts;

  const { error } = await adminClient
    .from("phone_verifications")
    .update({
      attempts: nextAttempts,
      status: locked ? "locked" : "pending",
      locked_at: locked ? nowIso : null,
      locked_until: locked ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null,
    })
    .eq("id", challengeRowId)
    .eq("status", "pending");

  return !error;
}

export async function POST(request: Request) {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: UI_MESSAGES.generic.server }, { status: 503 });
  }

  const publicClient = getSupabasePublicServerClient();
  if (!publicClient) {
    return NextResponse.json({ error: UI_MESSAGES.generic.server }, { status: 503 });
  }

  let body: VerifyOtpBody = {};
  try {
    body = (await request.json()) as VerifyOtpBody;
  } catch {
    body = {};
  }

  const normalizedPhone = normalizePhoneNumber(asTrimmedString(body.phone));
  const otp = asTrimmedString(body.otp);
  const challengeId = asTrimmedString(body.challengeId);

  if (!normalizedPhone || !otp || !challengeId) {
    return NextResponse.json({ error: "Enter your phone number, OTP, and challenge id." }, { status: 400 });
  }

  const challenge = await loadLatestChallenge(adminClient, normalizedPhone, challengeId);
  if (!challenge) {
    return NextResponse.json({ error: UI_MESSAGES.auth.phoneNotFound }, { status: 404 });
  }

  const challengeRowId = asTrimmedString(challenge.id);
  const challengeSessionId = asTrimmedString(challenge.session_id);
  const challengeAttempts = Number(challenge.attempts ?? 0);
  const challengeMaxAttempts = Number(challenge.max_attempts ?? 5);
  const challengeMetadata =
    challenge.metadata && typeof challenge.metadata === "object" && !Array.isArray(challenge.metadata)
      ? (challenge.metadata as Record<string, unknown>)
      : {};

  if (challenge.status === "verified") {
    return NextResponse.json({ error: UI_MESSAGES.auth.invalidOtp }, { status: 409 });
  }

  if (challenge.status === "locked") {
    return NextResponse.json({ error: UI_MESSAGES.auth.tooManyAttempts }, { status: 429 });
  }

  const expiresAt = asTrimmedString(challenge.expires_at);
  if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
    await adminClient
      .from("phone_verifications")
      .update({
        status: "expired",
      })
      .eq("id", challengeRowId)
      .eq("status", "pending");

    return NextResponse.json({ error: UI_MESSAGES.auth.expiredOtp }, { status: 410 });
  }

  const verification = await verifyOTP(challengeSessionId, otp);
  if (!verification.ok || !verification.matched) {
    await markFailedAttempt(adminClient, challengeRowId, challengeAttempts, challengeMaxAttempts);
    return NextResponse.json({ error: UI_MESSAGES.auth.invalidOtp }, { status: 400 });
  }

  const metadata = {
    ...challengeMetadata,
    phone: normalizedPhone,
  };

  const identity = await ensurePhoneAuthIdentity(adminClient, normalizedPhone, metadata);
  if (identity.error || !identity.userId || !identity.password) {
    return NextResponse.json(
      {
        error: identity.error ?? UI_MESSAGES.generic.server,
      },
      { status: 400 },
    );
  }

  const signInResult = await publicClient.auth.signInWithPassword({
    phone: normalizedPhone,
    password: identity.password,
  });

  if (signInResult.error || !signInResult.data.session) {
    console.error("Failed to create phone session");
    return NextResponse.json(
      {
        error: UI_MESSAGES.auth.loginFailed,
      },
      { status: 400 },
    );
  }

  const consumed = await consumeChallenge(adminClient, challengeSessionId, challengeRowId, challengeAttempts);
  if (!consumed) {
    return NextResponse.json(
      {
        error: UI_MESSAGES.auth.invalidOtp,
      },
      { status: 409 },
    );
  }

  const { data: roleKey } = await publicClient.rpc("current_user_role_key");
  const redirectTo = resolvePostAuthPath((roleKey as AuthRoleKey | null) ?? null);

  return NextResponse.json({
    success: true,
    challengeId: challengeSessionId,
    redirectTo,
    session: signInResult.data.session,
  });
}
