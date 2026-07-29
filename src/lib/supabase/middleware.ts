import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "./types";
import { getSupabaseEnvironment } from "./env";

type MiddlewareClientResult = {
  response: NextResponse;
  isConfigured: boolean;
  supabase: ReturnType<typeof createServerClient<Database>> | null;
};

export function createSupabaseMiddlewareClient(request: NextRequest, response: NextResponse): MiddlewareClientResult {
  const environment = getSupabaseEnvironment();

  if (!environment) {
    return {
      response,
      isConfigured: false,
      supabase: null,
    };
  }

  const cookies: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll().map(({ name, value }) => ({ name, value }));
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        request.cookies.set(name, value);
        response.cookies.set(name, value, options);
      });

      response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
    },
  };

  return {
    response,
    isConfigured: true,
    supabase: createServerClient<Database>(environment.url, environment.anonKey, {
      cookies,
    }),
  };
}
