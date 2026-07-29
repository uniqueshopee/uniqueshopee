"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnvironment } from "./env";
import type { Database } from "./types";

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient() {
  const environment = getSupabaseEnvironment();

  if (!environment) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(environment.url, environment.anonKey);
  }

  return browserClient;
}

export function hasSupabaseBrowserClient() {
  return getSupabaseEnvironment() !== null;
}
