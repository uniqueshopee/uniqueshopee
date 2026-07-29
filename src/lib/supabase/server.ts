import "server-only";

import { cookies } from "next/headers";
import { createServerClient, type CookieMethodsServerDeprecated } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnvironment } from "./env";
import type { Database } from "./types";

export async function getSupabaseServerClient(): Promise<SupabaseClient<Database> | null> {
  const environment = getSupabaseEnvironment();

  if (!environment) {
    return null;
  }

  const cookieStore = await cookies();
  const cookieMethods: CookieMethodsServerDeprecated = {
    get(name) {
      return cookieStore.get(name)?.value;
    },
  };

  return createServerClient<Database>(environment.url, environment.anonKey, {
    cookies: cookieMethods,
  });
}

export async function hasSupabaseServerClient() {
  return (await getSupabaseServerClient()) !== null;
}
