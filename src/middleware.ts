import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import type { AuthRoleKey } from "@/lib/supabase/auth";
import { isAdminRole, resolvePostAuthPath, sanitizeRedirectPath } from "@/lib/auth";
import { isQaBypassEnabled } from "@/lib/qa-mode";

const PROTECTED_PREFIXES = ["/account", "/orders", "/wishlist", "/cart", "/checkout", "/notifications"];
const AUTH_REDIRECT_PAGES = ["/login", "/register", "/forgot-password"];

function pathMatches(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function redirectTo(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

export async function middleware(request: NextRequest) {
  if (isQaBypassEnabled()) {
    // DEV ONLY
    // REMOVE OR DISABLE BEFORE PRODUCTION
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });
  const { supabase, response: nextResponse } = createSupabaseMiddlewareClient(request, response);

  if (!supabase) {
    return nextResponse;
  }

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = pathMatches(pathname, PROTECTED_PREFIXES) || pathname.startsWith("/admin");
  const isAuthRedirectRoute = pathMatches(pathname, AUTH_REDIRECT_PAGES);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isProtectedRoute) {
      const redirectPath = `/login?redirectTo=${encodeURIComponent(`${pathname}${request.nextUrl.search}`)}`;
      return redirectTo(request, redirectPath);
    }

    return nextResponse;
  }

  const { data: roleKey } = await supabase.rpc("current_user_role_key");
  const role = (roleKey as AuthRoleKey | null) ?? null;

  if (isAuthRedirectRoute) {
    const target = sanitizeRedirectPath(
      request.nextUrl.searchParams.get("redirectTo"),
      resolvePostAuthPath(role),
    );
    return redirectTo(request, target);
  }

  if (pathname.startsWith("/admin") && !isAdminRole(role)) {
    return redirectTo(request, "/account");
  }

  return nextResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
