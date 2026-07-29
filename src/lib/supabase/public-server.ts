import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnvironment } from "./env";
import type { Database } from "./types";

let publicServerClient: SupabaseClient<Database> | null = null;

export function getSupabasePublicServerClient() {
  const environment = getSupabaseEnvironment();

  if (!environment) {
    return null;
  }

  if (!publicServerClient) {
    publicServerClient = createClient<Database>(environment.url, environment.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  return publicServerClient;
}

export function hasSupabasePublicServerClient() {
  return getSupabaseEnvironment() !== null;
}
