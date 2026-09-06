import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseEnvironment } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

export const ACCOUNT_DELETION_STATES = [
  "ACTIVE",
  "DELETION_PENDING",
  "DATA_CLEANUP_FAILED",
  "DATA_CLEANED",
  "AUTH_DELETE_FAILED",
  "AUTH_DELETED",
  "FINALIZATION_FAILED",
  "COMPLETED",
] as const;

export type AccountDeletionState = (typeof ACCOUNT_DELETION_STATES)[number];

export type AccountDeletionRequest = {
  id: string;
  auth_user_id: string;
  state: AccountDeletionState;
  failure_code: string | null;
  failure_message: string | null;
  retry_count: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type DeletionClient = SupabaseClient<Database>;

const REQUEST_COLUMNS =
  "id, auth_user_id, state, failure_code, failure_message, retry_count, completed_at, created_at, updated_at";
const STALE_CLAIM_MINUTES = 15;

function getDeletionClient(): DeletionClient | null {
  return getSupabaseServiceRoleClient();
}

function isDeletionState(value: unknown): value is AccountDeletionState {
  return typeof value === "string" && (ACCOUNT_DELETION_STATES as readonly string[]).includes(value);
}

function normalizeRequest(value: unknown): AccountDeletionRequest | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.auth_user_id !== "string" ||
    !isDeletionState(row.state) ||
    typeof row.retry_count !== "number" ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    auth_user_id: row.auth_user_id,
    state: row.state,
    failure_code: typeof row.failure_code === "string" ? row.failure_code : null,
    failure_message: typeof row.failure_message === "string" ? row.failure_message : null,
    retry_count: row.retry_count,
    completed_at: typeof row.completed_at === "string" ? row.completed_at : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function findAccountDeletionRequest(authUserId: string) {
  const client = getDeletionClient();
  if (!client) {
    return { request: null, error: "Deletion service is unavailable." };
  }

  const { data, error } = await client
    .from("account_deletion_requests")
    .select(REQUEST_COLUMNS)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    return { request: null, error: "Unable to read deletion state." };
  }

  const request = data ? normalizeRequest(data) : null;
  return request || !data ? { request, error: null } : { request: null, error: "Invalid deletion state." };
}

export async function createAccountDeletionRequest(authUserId: string) {
  const client = getDeletionClient();
  if (!client) {
    return { request: null, error: "Deletion service is unavailable." };
  }

  const existing = await findAccountDeletionRequest(authUserId);
  if (existing.error) {
    return { request: null, error: existing.error };
  }
  if (existing.request) {
    return existing;
  }

  const { data, error } = await client
    .from("account_deletion_requests")
    .insert({ auth_user_id: authUserId, state: "ACTIVE" })
    .select(REQUEST_COLUMNS)
    .single();

  if (!error) {
    return { request: normalizeRequest(data), error: null };
  }

  if (error.code === "23505") {
    return findAccountDeletionRequest(authUserId);
  }

  return { request: null, error: "Unable to create deletion state." };
}

export async function claimAccountDeletionRequest(requestId: string, expectedState: "ACTIVE" | "DATA_CLEANUP_FAILED") {
  const client = getDeletionClient();
  if (!client) {
    return { request: null, error: "Deletion service is unavailable.", claimed: false };
  }

  const { data, error } = await client
    .from("account_deletion_requests")
    .update({ state: "DELETION_PENDING", failure_code: null, failure_message: null })
    .eq("id", requestId)
    .eq("state", expectedState)
    .select(REQUEST_COLUMNS)
    .maybeSingle();

  if (error) {
    return { request: null, error: "Unable to lock deletion request.", claimed: false };
  }

  const request = data ? normalizeRequest(data) : null;
  return request
    ? { request, error: null, claimed: true }
    : { request: null, error: null, claimed: false };
}

export async function claimStaleCleanupRequest(requestId: string) {
  const client = getDeletionClient();
  if (!client) return { request: null, error: "Deletion service is unavailable.", claimed: false };
  const cutoff = new Date(Date.now() - STALE_CLAIM_MINUTES * 60 * 1000).toISOString();
  const { data, error } = await client
    .from("account_deletion_requests")
    .update({ failure_code: "CLEANUP_RETRY_IN_PROGRESS", failure_message: null })
    .eq("id", requestId)
    .eq("state", "DELETION_PENDING")
    .lt("updated_at", cutoff)
    .select(REQUEST_COLUMNS)
    .maybeSingle();
  if (error) return { request: null, error: "Unable to recover deletion request.", claimed: false };
  const request = data ? normalizeRequest(data) : null;
  return request ? { request, error: null, claimed: true } : { request: null, error: null, claimed: false };
}

export async function claimAuthDeletionRetry(requestId: string, expectedState: "DATA_CLEANED" | "AUTH_DELETE_FAILED") {
  const client = getDeletionClient();
  if (!client) {
    return { request: null, error: "Deletion service is unavailable.", claimed: false };
  }

  const { data, error } = await client
    .from("account_deletion_requests")
    .update({ failure_code: "AUTH_DELETE_IN_PROGRESS", failure_message: null })
    .eq("id", requestId)
    .eq("state", expectedState)
    .or("failure_code.is.null,failure_code.neq.AUTH_DELETE_IN_PROGRESS")
    .select(REQUEST_COLUMNS)
    .maybeSingle();

  if (error) {
    return { request: null, error: "Unable to lock Auth deletion retry.", claimed: false };
  }

  const request = data ? normalizeRequest(data) : null;
  return request
    ? { request, error: null, claimed: true }
    : { request: null, error: null, claimed: false };
}

export async function claimStaleAuthDeletionRetry(requestId: string) {
  const client = getDeletionClient();
  if (!client) return { request: null, error: "Deletion service is unavailable.", claimed: false };
  const cutoff = new Date(Date.now() - STALE_CLAIM_MINUTES * 60 * 1000).toISOString();
  const { data, error } = await client
    .from("account_deletion_requests")
    .update({ failure_code: "AUTH_DELETE_IN_PROGRESS", failure_message: null })
    .eq("id", requestId)
    .in("state", ["DATA_CLEANED", "AUTH_DELETE_FAILED"])
    .eq("failure_code", "AUTH_DELETE_IN_PROGRESS")
    .lt("updated_at", cutoff)
    .select(REQUEST_COLUMNS)
    .maybeSingle();
  if (error) return { request: null, error: "Unable to recover Auth deletion.", claimed: false };
  const request = data ? normalizeRequest(data) : null;
  return request ? { request, error: null, claimed: true } : { request: null, error: null, claimed: false };
}

export async function markAuthDeletionInProgress(requestId: string) {
  const client = getDeletionClient();
  if (!client) return { request: null, error: "Deletion service is unavailable." };
  const { data, error } = await client
    .from("account_deletion_requests")
    .update({ failure_code: "AUTH_DELETE_IN_PROGRESS", failure_message: null })
    .eq("id", requestId)
    .in("state", ["DATA_CLEANED", "AUTH_DELETE_FAILED"])
    .select(REQUEST_COLUMNS)
    .single();
  return error ? { request: null, error: "Unable to prepare Auth deletion." } : { request: normalizeRequest(data), error: null };
}

export async function cleanupAccountDeletionChallenges(authUserId: string) {
  const client = getDeletionClient();
  if (!client) return { completed: false, error: "Deletion service is unavailable." };
  const { error } = await client.from("account_deletion_phone_challenges").delete().eq("auth_user_id", authUserId);
  return error ? { completed: false, error: "Unable to clean deletion verification data." } : { completed: true, error: null };
}

export async function updateAccountDeletionState(
  requestId: string,
  state: AccountDeletionState,
  details?: { failureCode?: string | null; failureMessage?: string | null; completedAt?: string | null },
) {
  const client = getDeletionClient();
  if (!client) {
    return { request: null, error: "Deletion service is unavailable." };
  }

  const update = {
    state,
    failure_code: details?.failureCode ?? null,
    failure_message: details?.failureMessage ?? null,
    completed_at: details?.completedAt ?? (state === "COMPLETED" ? new Date().toISOString() : null),
  };

  const { data, error } = await client
    .from("account_deletion_requests")
    .update(update)
    .eq("id", requestId)
    .select(REQUEST_COLUMNS)
    .single();

  if (error) {
    return { request: null, error: "Unable to update deletion state." };
  }

  return { request: normalizeRequest(data), error: null };
}

export function recentReauthenticationStatus() {
  return {
    verified: false,
    reason: "Recent destructive-action re-authentication is not implemented for the configured providers.",
  } as const;
}

function getProvider(user: User) {
  const providers = user.identities?.map((identity) => identity.provider) ?? [];
  return user.app_metadata?.provider ?? providers[0] ?? null;
}

export async function verifyDeletionReauthentication(user: User, password: string) {
  if (getProvider(user) !== "email") {
    return {
      verified: false,
      error: "Deletion re-authentication is unavailable for this sign-in provider.",
    } as const;
  }

  if (!user.email || password.length === 0 || password.length > 1024) {
    return { verified: false, error: "Password confirmation is required." } as const;
  }

  const environment = getSupabaseEnvironment();
  if (!environment) {
    return { verified: false, error: "Deletion service is unavailable." } as const;
  }

  const verificationClient = createClient<Database>(environment.url, environment.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await verificationClient.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (error || data.user?.id !== user.id) {
    return { verified: false, error: "Password confirmation failed." } as const;
  }

  return { verified: true, error: null } as const;
}

export async function runApprovedRelationalCleanup(authUserId: string) {
  const client = getDeletionClient();
  if (!client) {
    return { completed: false, error: "Deletion service is unavailable." } as const;
  }

  const { error } = await client.rpc("prepare_account_deletion_cleanup", {
    p_auth_user_id: authUserId,
  });
  return error
    ? { completed: false, error: "Relational cleanup failed." as const }
    : { completed: true, error: null } as const;
}

export async function deleteAuthUser(authUserId: string) {
  const client = getDeletionClient();
  if (!client) {
    return { completed: false, error: "Deletion service is unavailable." } as const;
  }

  const { error } = await client.auth.admin.deleteUser(authUserId);
  return error
    ? { completed: false, error: "Auth deletion failed." as const }
    : { completed: true, error: null } as const;
}

export function hasDeletionService() {
  return getDeletionClient() !== null;
}
