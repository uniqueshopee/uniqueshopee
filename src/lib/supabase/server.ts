import "server-only";

import { cookies } from "next/headers";
import { createServerClient, type CookieMethodsServerDeprecated } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
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

export type SupabaseRequestAuth = {
  client: SupabaseClient<Database> | null;
  user: User | null;
  configured: boolean;
  invalidBearer: boolean;
};

export async function resolveSupabaseRequestAuth(request: Request): Promise<SupabaseRequestAuth> {
  const environment = getSupabaseEnvironment();

  if (!environment) {
    return { client: null, user: null, configured: false, invalidBearer: false };
  }

  const authorization = request.headers.get("authorization");
  let client: SupabaseClient<Database> | null = null;
  let invalidBearer = false;

  if (authorization !== null) {
    const match = authorization.match(/^Bearer\s+(\S+)$/i);
    if (!match) {
      invalidBearer = true;
    } else {
      client = createClient<Database>(environment.url, environment.anonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: {
            Authorization: "Bearer " + match[1],
          },
        },
      });
    }
  } else {
    client = await getSupabaseServerClient();
  }

  if (!client || invalidBearer) {
    return { client, user: null, configured: true, invalidBearer };
  }

  const {
    data: { user },
  } = await client.auth.getUser();

  return { client, user, configured: true, invalidBearer: false };
}
