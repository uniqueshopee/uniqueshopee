import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { CartSyncProvider } from "@/components/cart/cart-sync-provider";
import { WishlistSyncProvider } from "@/components/wishlist/wishlist-sync-provider";
import { Toaster } from "@/components/feedback/toaster";
import { SiteShell } from "@/components/layout/site-shell";
import { JsonLdScript } from "@/components/seo/json-ld";
import { formatMissingEnvironmentMessage } from "@/lib/environment";
import { absoluteUrl, getSiteUrl, organizationJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "UniqueShopee",
    template: "%s | UniqueShopee",
  },
  description: "Premium online store for Paints, Plumbing Products and Home Improvement.",
  openGraph: {
    title: "UniqueShopee",
    description: "Premium online store for Paints, Plumbing Products and Home Improvement.",
    url: "/",
    siteName: "UniqueShopee",
    type: "website",
    images: [
      {
        url: absoluteUrl("/images/seo/og-default.svg"),
        width: 1200,
        height: 630,
        alt: "UniqueShopee storefront",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UniqueShopee",
    description: "Premium online store for Paints, Plumbing Products and Home Improvement.",
    images: [absoluteUrl("/images/seo/og-default.svg")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
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
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-background text-text font-sans antialiased">
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
        <JsonLdScript data={organizationJsonLd()} />
        <Toaster />
      </body>
    </html>
  );
}
