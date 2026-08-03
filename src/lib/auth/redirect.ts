import { getSiteUrl } from "@/lib/seo";
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
  const baseUrl = getSiteUrl();
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

export function buildLoginRedirectPath(redirectTo: string | null | undefined, fallback = "/login") {
  const safeRedirect = sanitizeRedirectPath(redirectTo ?? null, "");
  if (!safeRedirect) {
    return fallback;
  }

  return `/login?redirectTo=${encodeURIComponent(safeRedirect)}`;
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
