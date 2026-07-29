import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { CartSyncProvider } from "@/components/cart/cart-sync-provider";
import { WishlistSyncProvider } from "@/components/wishlist/wishlist-sync-provider";
import { Toaster } from "@/components/feedback/toaster";
import { SiteShell } from "@/components/layout/site-shell";
import { formatMissingEnvironmentMessage } from "@/lib/environment";

export const metadata: Metadata = {
  title: {
    default: "UniqueShopee",
    template: "%s · UniqueShopee",
  },
  description: "Premium online store for Paints, Plumbing Products and Home Improvement.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== "production") {
    const envMessage = formatMissingEnvironmentMessage();
    if (envMessage) {
      console.warn(`[UniqueShopee] ${envMessage}`);
    }
  }

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-[var(--radius-md)] focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <AuthProvider>
          <CartSyncProvider>
            <WishlistSyncProvider>
              <SiteShell>{children}</SiteShell>
            </WishlistSyncProvider>
          </CartSyncProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
