"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Droplets,
  Heart,
  Paintbrush,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  ShoppingCart,
  UserCircle2,
  Wrench,
} from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, formatPrice } from "@/lib/utils";
import { useWishlistStore } from "@/store/wishlist-store";
import { addValidatedCartItem } from "@/lib/cart-service";

type HomeProduct = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  price: number;
  compareAtPrice?: number;
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
  stockCount?: number;
  reservedCount?: number;
  lowStockThreshold?: number;
  badge?: "new" | "bestseller" | "sale";
};

type HomeMarketplacePageProps = {
  products: CatalogProduct[];
  featuredProducts: CatalogProduct[];
};

const FALLBACK_HOME_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="Product placeholder">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f8efe5"/>
          <stop offset="100%" stop-color="#e8f2fb"/>
        </linearGradient>
      </defs>
      <rect width="800" height="800" rx="48" fill="url(#g)"/>
      <circle cx="400" cy="330" r="120" fill="rgba(255,255,255,0.75)"/>
      <rect x="240" y="500" width="320" height="38" rx="19" fill="rgba(15,23,42,0.14)"/>
      <rect x="290" y="558" width="220" height="22" rx="11" fill="rgba(15,23,42,0.10)"/>
    </svg>`,
  );

const SEO_NOISE_RE = /(test|demo|placeholder|sample|dummy|qa)/i;

const SHOP_CATEGORIES = [
  { label: "Paints", href: "/products?department=paints", icon: Paintbrush, tone: "bg-amber-500/12 text-amber-600" },
  { label: "Wall Putty", href: "/products?department=paints&category=Wall%20Putty", icon: Sparkles, tone: "bg-orange-500/12 text-orange-600" },
  { label: "Waterproofing", href: "/products?department=paints&category=Waterproofing", icon: ShieldCheck, tone: "bg-emerald-500/12 text-emerald-600" },
  { label: "Primer", href: "/products?department=paints&category=Primer", icon: Wrench, tone: "bg-slate-500/12 text-slate-600" },
  { label: "Plumbing", href: "/products?department=plumbing", icon: Droplets, tone: "bg-sky-500/12 text-sky-600" },
  { label: "Fittings", href: "/products?department=plumbing&category=Fittings", icon: Wrench, tone: "bg-cyan-500/12 text-cyan-700" },
];

const HERO_COPY = {
  subtitle: "Premium paint and plumbing essentials, now powered by the live UniqueShopee catalog.",
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
};

function toHomeProduct(product: CatalogProduct, badge: HomeProduct["badge"] = product.badge) {
  return {
    id: product.id,
    title: product.name,
    subtitle: product.brandName,
    image: product.primaryImageUrl || product.image,
    href: `/product/${product.slug}`,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    rating: product.rating,
    reviewCount: product.reviewCount,
    inStock: product.inStock,
    stockCount: product.stockCount,
    reservedCount: product.reservedCount,
    lowStockThreshold: product.lowStockThreshold,
    badge,
  } satisfies HomeProduct;
}

function isNoiseProduct(product: CatalogProduct) {
  return SEO_NOISE_RE.test(product.name) || SEO_NOISE_RE.test(product.slug) || SEO_NOISE_RE.test(product.brandName);
}

function buildHomeProducts(products: CatalogProduct[]): HomeProduct[] {
  const visibleProducts = products.filter((product) => !isNoiseProduct(product));
  const paints = visibleProducts.filter((product) => product.departmentSlug === "paints").slice(0, 2);
  const plumbing = visibleProducts.filter((product) => product.departmentSlug === "plumbing").slice(0, 2);
  const ordered = [paints[0], plumbing[0], paints[1], plumbing[1]].filter(Boolean) as CatalogProduct[];

  if (ordered.length > 0) {
    return ordered.map((product) => toHomeProduct(product, product.badge));
  }

  return products.slice(0, 4).map((product) => toHomeProduct(product, product.badge));
}

function CompactProductCard({ product }: { product: HomeProduct }) {
  const isWishlisted = useWishlistStore((state) => state.has(product.id));
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const isOutOfStock = !product.inStock || (product.stockCount ?? 0) <= 0;
  const savePercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : null;

  const handleAdd = async () => {
    if (isOutOfStock) {
      return;
    }

    await addValidatedCartItem(
      {
        productId: product.id,
        name: product.title,
        price: product.price,
        image: product.image,
        slug: product.href.replace("/product/", ""),
        category: product.subtitle,
        compareAtPrice: product.compareAtPrice,
        inStock: product.inStock,
        stockCount: product.stockCount,
        reservedCount: product.reservedCount,
        lowStockThreshold: product.lowStockThreshold,
      },
      1,
    );
  };

  return (
    <motion.article variants={ITEM_VARIANTS} className="group h-full">
      <Card className="h-full overflow-hidden rounded-[1.3rem] border-white/80 bg-white/92 p-0 shadow-[var(--shadow-sm)]">
        <div className="relative">
          <Link
            href={product.href}
            aria-label={`View ${product.title}`}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <div className="relative aspect-[1.1] overflow-hidden bg-background-secondary">
              <Image
                src={product.image || FALLBACK_HOME_IMAGE}
                alt={product.title}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-x-3 top-3 flex items-start justify-start gap-2">
                {product.badge && (
                  <Badge
                    variant={
                      product.badge === "sale" ? "danger" : product.badge === "bestseller" ? "success" : "accent"
                    }
                    className="rounded-full px-2.5 py-1 text-[10px]"
                  >
                    {product.badge === "sale" ? "Sale" : product.badge === "bestseller" ? "Bestseller" : "New"}
                  </Badge>
                )}
              </div>
              {isOutOfStock && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/65 backdrop-blur-[1px]">
                  <Badge variant="neutral">Out of Stock</Badge>
                </div>
              )}
            </div>

            <div className="space-y-2 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                {product.subtitle}
              </p>
              <h3 className="line-clamp-2 text-sm font-bold leading-5 text-text">{product.title}</h3>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                <span className="font-semibold text-text">{product.rating?.toFixed(1) ?? "4.6"}</span>
                <span>({product.reviewCount ?? 0})</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-base font-bold text-text">{formatPrice(product.price)}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  {savePercent ? `Save ${savePercent}%` : "Free shipping"}
                </p>
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={isWishlisted}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-text shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <Heart className={cn("h-4 w-4", isWishlisted && "fill-danger text-danger")} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/70 p-3 pt-0">
          <Button
            type="button"
            size="icon"
            variant="primary"
            className="h-10 w-10 shrink-0 rounded-full"
            onClick={() => void handleAdd()}
            aria-label={`Add ${product.title} to cart`}
            disabled={isOutOfStock}
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </motion.article>
  );
}

function ProductRail({
  title,
  subtitle,
  products,
  viewAllHref,
  viewAllLabel = "See all",
}: {
  title: string;
  subtitle: string;
  products: HomeProduct[];
  viewAllHref: string;
  viewAllLabel?: string;
}) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-text">{title}</h2>
          <p className="mt-1 text-sm font-medium text-muted">{subtitle}</p>
        </div>
        <Link
          href={viewAllHref}
          className="shrink-0 text-sm font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {viewAllLabel}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {products.map((product) => (
          <div key={product.id}>
            <CompactProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeMarketplacePage({ products, featuredProducts }: HomeMarketplacePageProps) {
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const homeProducts = useMemo(() => buildHomeProducts(products), [products]);
  const featuredRailProducts = useMemo(
    () =>
      (featuredProducts.length > 0 ? featuredProducts : products.slice(0, 4))
        .filter((product) => !isNoiseProduct(product))
        .map((product, index) => toHomeProduct(product, index === 0 ? "bestseller" : product.badge)),
    [featuredProducts, products],
  );
  const featuredHeroImage = featuredProducts[0]?.primaryImageUrl ?? featuredProducts[0]?.image ?? homeProducts[0]?.image ?? FALLBACK_HOME_IMAGE;
  const plumbingHeroImage = homeProducts[1]?.image ?? FALLBACK_HOME_IMAGE;

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("q");
    if (typeof query === "string") {
      const trimmed = query.trim();
      router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
    }
  };

  return (
    <motion.main
      className="relative isolate overflow-hidden border-b border-border surface-texture"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <header className="space-y-4">
          <div className="flex items-center justify-end gap-2">
            <div className="flex items-center gap-2">
              <Link
                href="/wishlist"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-white/90 text-text"
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/account"
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-background-secondary text-sm font-bold text-text"
                aria-label="Account"
              >
                <UserCircle2 className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[0.95rem] font-black tracking-[0.5em] text-text sm:text-[1.05rem]">UNIQUE SHOPEE</p>
          </div>

          <form
            role="search"
            onSubmit={onSearchSubmit}
            className="flex items-center gap-2 rounded-[1.3rem] border border-border/70 bg-white/92 px-3 py-3 shadow-[var(--shadow-sm)]"
          >
            <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <input
              name="q"
              type="search"
              placeholder="Search paints, putty, primer, waterproofing..."
              className="h-10 min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-text placeholder:text-muted focus:outline-none"
            />
          </form>
        </header>

        <section className="mt-4">
          <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-gradient-to-br from-[#332a24] via-[#6f5a4b] to-[#9e7a5f] p-4 text-white shadow-[var(--shadow-lg)] sm:p-5">
            <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
                  Exclusive offer
                </div>
                <div className="space-y-3">
                  <h1 className="max-w-xl text-[2.15rem] font-black leading-[0.95] tracking-tight text-white sm:text-[2.65rem]">
                    Paint, protect, and upgrade every corner
                  </h1>
                  <p className="max-w-lg text-sm font-medium leading-7 text-white/82 sm:text-base">{HERO_COPY.subtitle}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="md"
                    asChild
                  className="border-white/10 bg-white text-text hover:bg-white/95"
                >
                    <Link href="/products?department=paints">
                      Shop paints
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    asChild
                    className="border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    <Link href="/products">Browse catalog</Link>
                  </Button>
                </div>
              </div>

              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Link href="/products?department=paints" className="group relative min-w-full snap-start overflow-hidden rounded-[1.6rem]">
                  <div className="relative aspect-[1.15]">
                    <Image src={featuredHeroImage} alt="Featured paint collection" fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/12 to-transparent" />
                  </div>
                  <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200">Hero pick</p>
                      <p className="text-lg font-bold text-white">Luxury Wall Makeover</p>
                    </div>
                    <span className="rounded-full bg-white/15 px-3 py-2 text-xs font-semibold text-white">Paints</span>
                  </div>
                </Link>
                <Link href="/products?department=plumbing" className="group relative min-w-full snap-start overflow-hidden rounded-[1.6rem]">
                  <div className="relative aspect-[1.15]">
                    <Image src={plumbingHeroImage} alt="Featured plumbing collection" fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/12 to-transparent" />
                  </div>
                  <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200">Hero pick</p>
                      <p className="text-lg font-bold text-white">Bathroom Upgrade</p>
                    </div>
                    <span className="rounded-full bg-white/15 px-3 py-2 text-xs font-semibold text-white">Plumbing</span>
                  </div>
                </Link>
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-6">
          <Card className="rounded-[1.6rem] border-rose-100 bg-rose-50/80 p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-text">Exclusive Offer</h2>
                  <Badge variant="danger" className="rounded-full px-2.5 py-1 text-[10px]">
                    LIMITED
                  </Badge>
                </div>
                <p className="text-sm font-medium text-muted">Flat 30% off on selected paints and plumbing essentials.</p>
              </div>
              <Button asChild variant="primary" size="sm" className="shrink-0">
                <Link href="/products">
                  Shop deal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {homeProducts.slice(0, 2).map((item) => (
                <div key={item.id} className="rounded-[1.2rem] bg-white p-2 shadow-[var(--shadow-sm)]">
                  <div className="relative aspect-square overflow-hidden rounded-[1rem] bg-background-secondary">
                    <Image src={item.image || FALLBACK_HOME_IMAGE} alt={item.title} fill className="object-cover" />
                    <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {item.badge === "sale" ? `Save ${Math.round(((item.compareAtPrice ?? item.price) - item.price) / Math.max(item.compareAtPrice ?? item.price, 1) * 100)}%` : "-40%"}
                    </span>
                  </div>
                  <div className="p-2">
                    <p className="text-sm font-semibold text-text">{item.title}</p>
                    <Link href={item.href} className="mt-1 inline-flex text-xs font-bold text-accent">
                      Shop now <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-text">Shop by Category</h2>
            <Link href="/products" className="text-sm font-semibold text-accent">
              View all
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SHOP_CATEGORIES.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex min-w-[4.9rem] flex-col items-center gap-2 rounded-[1.2rem] bg-white/92 px-3 py-3 text-center shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-[1rem]", item.tone)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-text">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <ProductRail
          title="Trending Now"
          subtitle="Freshly surfaced picks from the live catalog."
          products={homeProducts}
          viewAllHref="/products"
        />

        <ProductRail
          title="Editor's Picks"
          subtitle="A denser rail of featured items from across the catalog."
          products={featuredRailProducts}
          viewAllHref="/products"
          viewAllLabel="Browse all"
        />

      </div>
    </motion.main>
  );
}

export { HomeMarketplacePage };
