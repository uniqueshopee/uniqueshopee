import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./client";
import { readEnvironmentValue } from "@/lib/environment";
import type { Database } from "./types";
import { UI_MESSAGES, getFriendlyErrorMessage } from "@/lib/messages";

export type SupabaseAuthClient = SupabaseClient<Database>;
export type AuthRoleKey = "customer" | "admin" | "manager" | "staff";

export type AuthProfile = {
  id: string;
  role_id: string | null;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  customer_code: string;
  status: string;
};

export type SignInPayload = {
  identifier: string;
  password: string;
  client?: SupabaseAuthClient | null;
};

export type SignUpPayload = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  client?: SupabaseAuthClient | null;
  redirectTo?: string;
};

export type OAuthProviderName = "google";

export async function getSupabaseSession(client?: SupabaseAuthClient | null): Promise<Session | null> {
  const resolvedClient = client ?? getSupabaseBrowserClient();

  if (!resolvedClient) {
    return null;
  }

  const { data, error } = await resolvedClient.auth.getSession();
  return error ? null : data.session;
}

export async function getSupabaseUser(client?: SupabaseAuthClient | null): Promise<User | null> {
  const resolvedClient = client ?? getSupabaseBrowserClient();

  if (!resolvedClient) {
    return null;
  }

  const { data, error } = await resolvedClient.auth.getUser();
  return error ? null : data.user;
}

export async function getCurrentUserProfile(client?: SupabaseAuthClient | null): Promise<AuthProfile | null> {
  const resolvedClient = client ?? getSupabaseBrowserClient();

  if (!resolvedClient) {
    return null;
  }

  const { data: userData } = await resolvedClient.auth.getUser();
  const user = userData.user;

  if (!user) {
    return null;
  }

  const { data, error } = await resolvedClient
    .from("profiles")
    .select("id, role_id, full_name, email, phone, avatar_url, customer_code, status")
    .eq("id", user.id)
    .maybeSingle();

  return error ? null : (data as AuthProfile | null);
}

function makeCustomerCode(userId: string) {
  const compactId = userId.replace(/-/g, "").slice(0, 10).toUpperCase();
  return `CUS-${compactId || "USER"}`;
}

function getFallbackProfileEmail(user: User) {
  if (typeof user.email === "string" && user.email.trim().length > 0) {
    return user.email.trim();
  }

  const phone = typeof user.phone === "string" ? user.phone.trim().replace(/\D/g, "") : "";
  if (phone) {
    return `${phone}@phone.local`;
  }

  return `${user.id.replace(/-/g, "").slice(0, 12)}@auth.local`;
}

export async function ensureCurrentUserProfile(client?: SupabaseAuthClient | null): Promise<AuthProfile | null> {
  const resolvedClient = client ?? getSupabaseBrowserClient();

  if (!resolvedClient) {
    return null;
  }

  const { data: userData } = await resolvedClient.auth.getUser();
  const user = userData.user;

  if (!user) {
    return null;
  }

  const currentProfile = await getCurrentUserProfile(resolvedClient);
  if (currentProfile) {
    return currentProfile;
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : typeof user.user_metadata?.first_name === "string" || typeof user.user_metadata?.last_name === "string"
          ? [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(" ").trim()
          : null;

  const { error } = await resolvedClient.from("profiles").upsert(
    {
      id: user.id,
      role_id: null,
      full_name: fullName || null,
      email: getFallbackProfileEmail(user),
      phone: typeof user.phone === "string" && user.phone.trim().length > 0 ? user.phone.trim() : null,
      avatar_url: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
      customer_code: makeCustomerCode(user.id),
      status: "active",
      metadata: user.user_metadata ?? {},
    },
    { onConflict: "id" },
  );

  if (error) {
    return null;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const profile = await getCurrentUserProfile(resolvedClient);
    if (profile) {
      return profile;
    }

    await new Promise((resolve) => globalThis.setTimeout(resolve, 120));
  }

  return null;
}

export async function getCurrentUserRoleKey(client?: SupabaseAuthClient | null): Promise<AuthRoleKey | null> {
  const resolvedClient = client ?? getSupabaseBrowserClient();

  if (!resolvedClient) {
    return null;
  }

  const { data, error } = await resolvedClient.rpc("current_user_role_key");
  return error ? null : (data as AuthRoleKey | null);
}

export async function signInWithEmailPassword({ identifier, password, client }: SignInPayload) {
  const resolvedClient = client ?? getSupabaseBrowserClient();

  if (!resolvedClient) {
    return { error: UI_MESSAGES.generic.server };
  }

  const email = identifier.trim();
  if (!email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const { error } = await resolvedClient.auth.signInWithPassword({
    email,
    password,
  });

  return {
    error: error ? getFriendlyErrorMessage(error, UI_MESSAGES.auth.loginFailed) : null,
  };
}

export async function signUpWithEmailPassword({ email, password, fullName, phone, client, redirectTo }: SignUpPayload) {
  const resolvedClient = client ?? getSupabaseBrowserClient();

  if (!resolvedClient) {
    return { error: UI_MESSAGES.generic.server };
  }

  const resolvedRedirectTo = redirectTo ? normalizeRedirectUrl(redirectTo) : undefined;

  const { data, error } = await resolvedClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        first_name: fullName.split(/\s+/)[0] ?? fullName,
        last_name: fullName.split(/\s+/).slice(1).join(" ") || fullName.split(/\s+/)[0] || "",
        phone,
      },
      emailRedirectTo: resolvedRedirectTo,
    },
  });

  return {
    data,
    error: error ? getFriendlyErrorMessage(error, UI_MESSAGES.auth.emailAlreadyRegistered) : null,
  };
}

export async function sendPasswordResetEmail(email: string, redirectTo: string, client?: SupabaseAuthClient | null) {
  const resolvedClient = client ?? getSupabaseBrowserClient();

  if (!resolvedClient) {
    return { error: UI_MESSAGES.generic.server };
  }

  const resolvedRedirectTo = normalizeRedirectUrl(redirectTo);

  const { error } = await resolvedClient.auth.resetPasswordForEmail(email, {
    redirectTo: resolvedRedirectTo,
  });

  return {
    error: error ? getFriendlyErrorMessage(error, UI_MESSAGES.generic.server) : null,
  };
}

export async function resendVerificationEmail(email: string, redirectTo: string, client?: SupabaseAuthClient | null) {
  const resolvedClient = client ?? getSupabaseBrowserClient();

  if (!resolvedClient) {
    return { error: UI_MESSAGES.generic.server };
  }

  const resolvedRedirectTo = normalizeRedirectUrl(redirectTo);

  const { error } = await resolvedClient.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: resolvedRedirectTo,
    },
  });

  return {
    error: error ? getFriendlyErrorMessage(error, UI_MESSAGES.generic.server) : null,
  };
}

export async function updateSupabasePassword(password: string, client?: SupabaseAuthClient | null) {
  const resolvedClient = client ?? getSupabaseBrowserClient();

  if (!resolvedClient) {
    return { error: UI_MESSAGES.generic.server };
  }

  const { error } = await resolvedClient.auth.updateUser({ password });

  return {
    error: error ? getFriendlyErrorMessage(error, UI_MESSAGES.auth.sessionExpired) : null,
  };
}

export async function signOutSupabase(client?: SupabaseAuthClient | null) {
  const resolvedClient = client ?? getSupabaseBrowserClient();

  if (!resolvedClient) {
    return { success: false, error: new Error("Supabase is not configured.") };
  }

  const { error } = await resolvedClient.auth.signOut();

  return {
    success: !error,
    error,
  };
}

export async function signInWithOAuth(provider: OAuthProviderName, client?: SupabaseAuthClient | null, redirectTo?: string) {
  const resolvedClient = client ?? getSupabaseBrowserClient();

  if (!resolvedClient) {
    return { data: null as { url: string | null } | null, error: UI_MESSAGES.generic.server };
  }

  const resolvedRedirectTo = redirectTo ? normalizeRedirectUrl(redirectTo) : undefined;
  const { data, error } = await resolvedClient.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: resolvedRedirectTo,
    },
  });

  return {
    data,
    error: error ? getFriendlyErrorMessage(error, UI_MESSAGES.generic.server) : null,
  };
}

function normalizeRedirectUrl(value: string) {
  const siteUrl = readEnvironmentValue("NEXT_PUBLIC_SITE_URL");
  const baseUrl = siteUrl ?? (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return undefined;
  }
}
