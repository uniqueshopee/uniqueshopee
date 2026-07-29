"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Heart, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/types";
import { ProductCard } from "@/components/product/product-card";
import { ProductShowcase } from "@/components/product/product-showcase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWishlistStore } from "@/store/wishlist-store";
import { useWishlistSync } from "@/components/wishlist/wishlist-sync-provider";

const SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.04,
      delayChildren: 0.03,
    },
  },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
  },
};

function WishlistEmptyIllustration() {
  return (
    <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/10 via-sky-200/10 to-primary/10 blur-2xl" />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.4rem] border border-white/80 bg-white/90 shadow-[var(--shadow-sm)]">
        <Heart className="h-10 w-10 fill-danger/15 text-danger" aria-hidden="true" />
        <Sparkles className="absolute left-3 top-4 h-3 w-3 text-accent" aria-hidden="true" />
        <Sparkles className="absolute right-4 top-5 h-2.5 w-2.5 text-sky-500" aria-hidden="true" />
      </div>
    </div>
  );
}

function WishlistPageShell({ products }: { products: Product[] }) {
  const shouldReduceMotion = useReducedMotion();
  const { loaded, syncError, retrySync } = useWishlistSync();
  const wishlistProductIds = useWishlistStore((state) => state.productIds);

  const wishlistedProducts = useMemo(
    () => products.filter((product) => wishlistProductIds.has(product.id)),
    [products, wishlistProductIds],
  );

  const recommendedProducts = useMemo(
    () => products.filter((product) => !wishlistProductIds.has(product.id)).slice(0, 4),
    [products, wishlistProductIds],
  );

  if (!loaded) {
    return (
      <section className="relative isolate overflow-hidden border-b border-border surface-texture">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-12 h-80 w-80 rounded-full bg-orange-300/6 blur-3xl" />
          <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-sky-300/6 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
          <div className="mb-5 space-y-3">
            <Skeleton className="h-4 w-36 rounded-full" />
            <Skeleton className="h-8 w-44 rounded-2xl" />
            <Skeleton className="h-4 w-full max-w-xl rounded-full" />
          </div>
          <div className="mb-5 rounded-[1.35rem] border border-white/80 bg-white/92 p-4 shadow-[var(--shadow-lg)]">
            <Skeleton className="h-6 w-32 rounded-full" />
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-56 rounded-[1.4rem]" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <motion.section
      className="relative isolate overflow-hidden border-b border-border surface-texture"
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "visible"}
      variants={SECTION_VARIANTS}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-12 h-80 w-80 rounded-full bg-orange-300/6 blur-3xl" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-sky-300/6 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
        <motion.nav
          aria-label="Breadcrumb"
          className="mb-5 flex items-center gap-2 text-sm font-medium text-muted"
          variants={ITEM_VARIANTS}
        >
          <Link href="/" className="transition-colors hover:text-text">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-text">Wishlist</span>
        </motion.nav>

        <motion.header
          className="mb-5 rounded-[1.35rem] border border-white/80 bg-white/92 p-4 shadow-[var(--shadow-lg)] sm:p-5"
          variants={ITEM_VARIANTS}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent" className="eyebrow-font">
                  My Wishlist
                </Badge>
                <Badge variant="neutral" className="eyebrow-font">
                  {wishlistedProducts.length} Saved Products
                </Badge>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-text sm:text-3xl">
                {wishlistedProducts.length > 0 ? "My Wishlist" : "Your wishlist is empty"}
              </h1>
              <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-muted">
                Save products for later and return when you are ready.
              </p>
            </div>

            <div className="hidden sm:block">
              <Button asChild variant="ghost" size="sm" className="px-2 text-accent">
                <Link href="/products">
                  Continue Shopping
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.header>

        {syncError ? (
          <motion.div variants={ITEM_VARIANTS} className="mb-5 rounded-[1.35rem] border border-warning/20 bg-warning/10 p-4 shadow-[var(--shadow-sm)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-text">Wishlist sync needs another try</p>
                <p className="mt-1 text-sm font-medium text-muted">{syncError}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={retrySync}>
                Retry Sync
              </Button>
            </div>
          </motion.div>
        ) : null}

        {wishlistedProducts.length === 0 ? (
          <motion.div className="space-y-6" variants={SECTION_VARIANTS}>
            <motion.div
              variants={ITEM_VARIANTS}
              className="rounded-[1.35rem] border border-white/80 bg-white/92 p-5 text-center shadow-[var(--shadow-lg)]"
            >
              <WishlistEmptyIllustration />
              <h2 className="mt-4 text-xl font-bold text-text">Your wishlist is empty</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-muted">
                Start saving products you love. We will keep them here so you can come back later.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button asChild variant="primary" size="md">
                  <Link href="/products">
                    Continue Shopping
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="md">
                  <Link href="/search">Search products</Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.ul
            className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
            variants={SECTION_VARIANTS}
            initial={false}
            animate="visible"
          >
            {wishlistedProducts.map((product) => (
              <motion.li key={product.id} variants={ITEM_VARIANTS} className="list-none">
                <ProductCard product={product} />
              </motion.li>
            ))}
          </motion.ul>
        )}

        <div className="mt-8 space-y-6">
          <ProductShowcase
            title="Recommended Products"
            subtitle="Explore more premium Paint and Plumbing essentials curated for your next project."
            products={recommendedProducts.length > 0 ? recommendedProducts : products.slice(0, 4)}
            viewAllHref="/products"
            badge="Recommended"
            viewAllLabel="View All Products"
          />
        </div>
      </div>
    </motion.section>
  );
}

function WishlistPage({ products }: { products: Product[] }) {
  return <WishlistPageShell products={products} />;
}

export { WishlistPage };
