"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Home, LayoutGrid, LogOut, Menu, Package, ShoppingCart, User, X } from "lucide-react";
import type { SVGProps } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { SITE_NAME, CATEGORIES, MOBILE_BOTTOM_NAV } from "@/lib/constants";
import { useCartStore } from "@/store/cart-store";
import { CONTACT_DETAILS } from "@/lib/support-data";
import { cn } from "@/lib/utils";
import { buildLoginRedirectPath } from "@/lib/auth";
import { isQaBypassEnabled } from "@/lib/qa-mode";

const ICONS = {
  home: Home,
  grid: LayoutGrid,
  cart: ShoppingCart,
  order: Package,
  user: User,
};

function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.5 11.9c0 4.7-3.8 8.5-8.5 8.5-1.5 0-2.9-.4-4.2-1.1L3.5 21l1.7-4.1c-.8-1.3-1.2-2.8-1.2-4.3 0-4.7 3.8-8.5 8.5-8.5s8 3.7 8 8.1Zm-8.5-6.8c-3.8 0-6.8 3.1-6.8 6.8 0 1.5.5 2.8 1.3 4l-.9 2.1 2.3-.8c1.1.7 2.5 1.2 4 1.2 3.8 0 6.8-3.1 6.8-6.8s-2.8-6.5-6.7-6.5Zm3.9 8.7c-.2.4-1 1-1.4 1.1-.4.1-.7.2-1.1 0-.4-.1-1-.4-1.7-.7-1.8-.8-3-2.6-3.2-2.8-.2-.2-1.5-2-1.5-3.8 0-1.2.6-1.9.8-2.2.2-.2.4-.3.6-.3h.4c.1 0 .3 0 .4.3l.6 1.5c.1.2.1.4 0 .6-.1.2-.2.4-.3.5l-.3.3c-.1.1-.2.2-.1.4.1.2.4.7.9 1.2.7.8 1.3 1 1.5 1.1.2.1.3.1.4 0 .1-.1.4-.4.5-.6.1-.2.3-.2.5-.1l1.7.8c.2.1.4.2.4.3.1.1.1.7-.1 1.1Z" />
    </svg>
  );
}

const SUPPORT_PHONE_DIGITS = CONTACT_DETAILS.customerCare.replace(/\D/g, "");
const WHATSAPP_URL = SUPPORT_PHONE_DIGITS ? `https://wa.me/${SUPPORT_PHONE_DIGITS}` : "https://wa.me/";

/** Visible below lg. Pairs with <BottomNav /> for primary actions. */
function MobileNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const { isAuthenticated, signOut } = useAuth();
  const cartCount = useCartStore((s) => s.totalItems());
  const getProtectedHref = (href: string) => {
    if (isAuthenticated) {
      return href;
    }

    if (href === "/cart" || href === "/account" || href === "/orders" || href === "/wishlist") {
      return buildLoginRedirectPath(href);
    }

    return href;
  };

  const handleAuthAction = async () => {
    const result = await signOut();
    if (result.error) {
      return;
    }

    setMenuOpen(false);
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3 lg:hidden">
      <button
        onClick={() => setMenuOpen(true)}
        aria-label="Open menu"
        className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-text hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <Link href="/" className="flex-1 truncate text-base font-bold text-primary">
        <span className="flex items-center gap-2">
          {SITE_NAME}
          {isQaBypassEnabled() ? (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-warning">
              QA Mode
            </span>
          ) : null}
        </span>
      </Link>

      <div className="flex items-center gap-1.5">
        <Link
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp support"
          className="relative flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-emerald-600 hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <WhatsAppIcon className="h-5 w-5" />
        </Link>
        <Link
          href={getProtectedHref("/cart")}
          aria-label="Cart"
          className="relative flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-text hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          {cartCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground"
            >
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          )}
        </Link>
      </div>

      {/* Category drawer */}
      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <AnimatePresence>
          {menuOpen && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-50 bg-primary/40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount>
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed inset-y-0 left-0 z-50 flex w-[min(88vw,22rem)] max-w-xs flex-col bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-lg)]"
                >
                  <div className="mb-6 flex items-center justify-between">
                    <Dialog.Title className="text-base font-bold text-text">
                      {SITE_NAME}
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button
                        aria-label="Close menu"
                        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-muted hover:bg-background-secondary hover:text-text"
                      >
                        <X className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </Dialog.Close>
                  </div>

                  <nav aria-label="Primary" className="space-y-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Quick Actions</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {MOBILE_BOTTOM_NAV.map((item) => {
                          const Icon = ICONS[item.icon];
                          const href = getProtectedHref(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={href}
                              onClick={() => setMenuOpen(false)}
                              className={cn(
                                "flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-3 text-sm font-semibold transition-colors",
                                "text-text hover:bg-background-secondary",
                              )}
                            >
                              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Categories</p>
                      <div className="mt-2 flex flex-col gap-1">
                        {CATEGORIES.map((category) => (
                          <Link
                            key={category.id}
                            href={category.href}
                            onClick={() => setMenuOpen(false)}
                            className="rounded-[var(--radius-md)] px-3 py-3 text-sm font-semibold text-text hover:bg-background-secondary"
                          >
                            {category.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </nav>

                  <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
                    <Link
                      href="/coupons"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-[var(--radius-md)] px-3 py-3 text-sm font-semibold text-danger hover:bg-danger/10"
                    >
                      Offers
                    </Link>
                    {isAuthenticated ? (
                      <button
                        type="button"
                        onClick={() => void handleAuthAction()}
                        className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border px-3 py-3 text-center text-sm font-semibold text-text hover:bg-background-secondary"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Logout
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        onClick={() => setMenuOpen(false)}
                        className="rounded-[var(--radius-md)] border border-border px-3 py-3 text-center text-sm font-semibold text-text hover:bg-background-secondary"
                      >
                        Login
                      </Link>
                    )}
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </div>
  );
}

export { MobileNav };
