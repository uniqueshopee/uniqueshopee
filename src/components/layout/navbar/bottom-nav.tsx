"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, User, Package } from "lucide-react";
import { MOBILE_BOTTOM_NAV } from "@/lib/constants";
import { useCartStore } from "@/store/cart-store";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { buildLoginRedirectPath } from "@/lib/auth";

const ICONS = {
  home: Home,
  grid: LayoutGrid,
  cart: ShoppingCart,
  order: Package,
  user: User,
};

/** Fixed to the viewport bottom on mobile only; hidden at lg. */
function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const cartCount = useCartStore((s) => s.totalItems());

  const getNavHref = (href: string) => {
    if (isAuthenticated) {
      return href;
    }

    if (href === "/cart" || href === "/account" || href === "/orders" || href === "/wishlist") {
      return buildLoginRedirectPath(href);
    }

    return href;
  };

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto max-w-md px-3">
        <div className="rounded-t-[1.35rem] border border-border/70 border-b-0 bg-white/96 shadow-[var(--shadow-lg)] backdrop-blur-xl">
          <ul className="grid grid-cols-5">
            {MOBILE_BOTTOM_NAV.map((item) => {
              const Icon = ICONS[item.icon];
              const active = pathname === item.href;
              const count = item.icon === "cart" ? cartCount : 0;
              const href = getNavHref(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-11 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors",
                      active ? "text-accent" : "text-muted",
                    )}
                  >
                    <span className="relative">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      {count > 0 && (
                        <span
                          aria-hidden="true"
                          className="absolute -right-1.5 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground"
                        >
                          {count > 9 ? "9+" : count}
                        </span>
                      )}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export { BottomNav };
