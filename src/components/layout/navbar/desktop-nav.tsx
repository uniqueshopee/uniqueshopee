"use client";

import type { ReactNode, SVGProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ShoppingCart, Tag, User } from "lucide-react";
import { SITE_NAME, CATEGORIES } from "@/lib/constants";
import { SearchBar } from "./search-bar";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { CONTACT_DETAILS } from "@/lib/support-data";

function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.5 11.9c0 4.7-3.8 8.5-8.5 8.5-1.5 0-2.9-.4-4.2-1.1L3.5 21l1.7-4.1c-.8-1.3-1.2-2.8-1.2-4.3 0-4.7 3.8-8.5 8.5-8.5s8 3.7 8 8.1Zm-8.5-6.8c-3.8 0-6.8 3.1-6.8 6.8 0 1.5.5 2.8 1.3 4l-.9 2.1 2.3-.8c1.1.7 2.5 1.2 4 1.2 3.8 0 6.8-3.1 6.8-6.8s-2.8-6.5-6.7-6.5Zm3.9 8.7c-.2.4-1 1-1.4 1.1-.4.1-.7.2-1.1 0-.4-.1-1-.4-1.7-.7-1.8-.8-3-2.6-3.2-2.8-.2-.2-1.5-2-1.5-3.8 0-1.2.6-1.9.8-2.2.2-.2.4-.3.6-.3h.4c.1 0 .3 0 .4.3l.6 1.5c.1.2.1.4 0 .6-.1.2-.2.4-.3.5l-.3.3c-.1.1-.2.2-.1.4.1.2.4.7.9 1.2.7.8 1.3 1 1.5 1.1.2.1.3.1.4 0 .1-.1.4-.4.5-.6.1-.2.3-.2.5-.1l1.7.8c.2.1.4.2.4.3.1.1.1.7-.1 1.1Z" />
    </svg>
  );
}

const SUPPORT_PHONE_DIGITS = CONTACT_DETAILS.customerCare.replace(/\D/g, "");
const WHATSAPP_URL = SUPPORT_PHONE_DIGITS ? `https://wa.me/${SUPPORT_PHONE_DIGITS}` : "https://wa.me/";

function IconLink({
  href,
  label,
  count,
  children,
}: {
  href: string;
  label: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative flex h-11 w-11 items-center justify-center rounded-full border border-transparent bg-white/0 text-text transition-all hover:border-border/70 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
      {!!count && count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

/** Visible at lg and above. Mobile uses <MobileNav /> + <BottomNav />. */
function DesktopNav() {
  const router = useRouter();
  const { isAuthenticated, signOut } = useAuth();
  const cartCount = useCartStore((s) => s.totalItems());
  const wishlistCount = useWishlistStore((s) => s.count());

  const handleAuthAction = async () => {
    const result = await signOut();
    if (result.error) {
      return;
    }

    router.replace("/");
    router.refresh();
  };

  return (
    <div className="hidden lg:block">
      {/* Row 1: logo, search, account actions */}
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-lg font-bold tracking-tight text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-[var(--radius-sm)]"
        >
          {SITE_NAME}
        </Link>

        <SearchBar className="max-w-2xl" />

        <nav className="ml-auto flex items-center gap-1" aria-label="Account">
          <Link
            href="/coupons"
            className="flex h-11 items-center gap-1.5 rounded-full border border-danger/15 bg-white/75 px-4 text-sm font-semibold text-danger transition-all hover:-translate-y-0.5 hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Tag className="h-4 w-4" aria-hidden="true" />
            Offers
          </Link>
          <IconLink href="/wishlist" label="Wishlist" count={wishlistCount}>
            <Heart className="h-5 w-5" aria-hidden="true" />
          </IconLink>
          <IconLink href="/cart" label="Cart" count={cartCount}>
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          </IconLink>
          <Link
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp support"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-emerald-500/15 bg-emerald-500/10 text-emerald-600 transition-all hover:-translate-y-0.5 hover:bg-emerald-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <WhatsAppIcon className="h-5 w-5" />
          </Link>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => void handleAuthAction()}
              className="ml-1 flex h-11 items-center gap-2 rounded-full border border-border bg-white/80 px-4 text-sm font-semibold text-text transition-all hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="ml-1 flex h-11 items-center gap-2 rounded-full border border-border bg-white/80 px-4 text-sm font-semibold text-text transition-all hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              Login
            </Link>
          )}
        </nav>
      </div>

      {/* Row 2: category navigation */}
      <nav
        aria-label="Categories"
        className="border-t border-border/60 bg-white/75 backdrop-blur-sm"
      >
        <ul className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-6">
          {CATEGORIES.map((category) => (
            <li key={category.id}>
              <Link
                href={category.href}
                className={cn(
                  "flex h-11 items-center px-3 text-sm font-semibold text-text",
                  "border-b-2 border-transparent transition-colors hover:border-accent hover:text-accent",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                )}
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export { DesktopNav };
