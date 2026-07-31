import { readEnvironmentValue } from "@/lib/environment";
import type { AuthRoleKey } from "@/lib/supabase/auth";

const ADMIN_ROLES: AuthRoleKey[] = ["admin", "manager"];

export function sanitizeRedirectPath(value: string | null | undefined, fallback = "/account") {
  if (!value) {
    return fallback;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return fallback;
}

export function buildAuthRedirectUrl(pathname: string, searchParams?: Record<string, string | number | boolean | null | undefined>) {
  const baseUrl = readEnvironmentValue("NEXT_PUBLIC_SITE_URL") ?? (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const url = new URL(normalizedPath, baseUrl);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === null || value === undefined || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export function resolvePostAuthPath(role: AuthRoleKey | null, redirectTo?: string | null) {
  if (role && ADMIN_ROLES.includes(role)) {
    return "/admin";
  }

  const safeRedirect = redirectTo ? sanitizeRedirectPath(redirectTo, "") : "";
  if (safeRedirect) {
    return safeRedirect;
  }

  return "/account";
}

export function isAdminRole(role: AuthRoleKey | null) {
  return !!role && ADMIN_ROLES.includes(role);
}
