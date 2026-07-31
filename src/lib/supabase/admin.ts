import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnvironment } from "./env";
import type { Database } from "./types";

let adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdminClient() {
  const environment = getSupabaseEnvironment();

  if (!environment) {
    return null;
  }

  if (!adminClient) {
    const serviceRoleKey = environment.serviceRoleKey;

    if (!serviceRoleKey) {
      return null;
    }

    adminClient = createClient<Database>(environment.url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  return adminClient;
}

export function hasSupabaseAdminClient() {
  return getSupabaseAdminClient() !== null;
}

export function getSupabaseServiceRoleClient() {
  return getSupabaseAdminClient();
}
