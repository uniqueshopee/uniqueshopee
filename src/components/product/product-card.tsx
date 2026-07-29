"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { motion } from "framer-motion";
import type { Product } from "@/types";
import { cn, formatPrice } from "@/lib/utils";
import { useWishlistStore } from "@/store/wishlist-store";
import { addValidatedCartItem } from "@/lib/cart-service";

function ProductCard({ product }: { product: Product }) {
  const isWishlisted = useWishlistStore((s) => s.has(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  async function handleAddToCart() {
    await addValidatedCartItem(
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        slug: product.slug,
        category: product.category,
        compareAtPrice: product.compareAtPrice,
        inStock: product.inStock,
        stockCount: product.stockCount,
        reservedCount: product.reservedCount,
        lowStockThreshold: product.lowStockThreshold,
      },
      1,
    );
  }

  function handleToggleWishlist() {
    toggleWishlist(product.id);
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="group relative"
    >
      <div className="overflow-hidden rounded-[1.35rem] border border-white/75 bg-white/92 shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-base)] hover:-translate-y-0.5 hover:border-accent/20 hover:shadow-[var(--shadow-lg)]">
        <Link
          href={`/product/${product.slug}`}
          aria-label={`View ${product.name}`}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-background-secondary via-white to-background-secondary">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            {!product.inStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/65 backdrop-blur-[1px]">
                <span className="rounded-full border border-border/70 bg-white/90 px-3 py-1 text-[11px] font-semibold text-text shadow-[var(--shadow-sm)]">
                  Out of stock
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1.5 p-2.5 sm:space-y-2 sm:p-3">
            <p className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-muted sm:block">
              {product.category}
            </p>
            <h3 className="line-clamp-1 text-[12.5px] font-bold leading-4 text-text sm:line-clamp-2 sm:text-[14px]">
              {product.name}
            </h3>

            {product.rating && (
              <div className="hidden items-center gap-1.5 text-[11px] font-medium text-muted sm:flex">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
                <span className="font-semibold text-text">{product.rating}</span>
                <span>({product.reviewCount})</span>
              </div>
            )}

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-[14px] font-bold text-text sm:text-[15px]">{formatPrice(product.price)}</span>
              {product.compareAtPrice && (
                <span className="text-[11px] font-medium text-muted line-through sm:text-xs">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
            </div>
          </div>
        </Link>

        <div className="flex items-center justify-between gap-3 border-t border-border/70 p-2.5 pt-0 sm:p-3 sm:pt-0">
          <button
            type="button"
            onClick={handleToggleWishlist}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={isWishlisted}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/85 bg-white/90 text-text shadow-[var(--shadow-md)] backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <Heart
              className={cn("h-3.5 w-3.5", isWishlisted && "fill-danger text-danger")}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={() => void handleAddToCart()}
            disabled={!product.inStock}
            aria-label={`Add ${product.name} to cart`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_14px_24px_-18px_rgba(16,33,58,0.6)] transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export { ProductCard };
