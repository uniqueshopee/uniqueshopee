"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  Droplets,
  Heart,
  MapPin,
  Paintbrush,
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
import { useAuth } from "@/components/auth/auth-provider";
import { SearchBar } from "@/components/layout/navbar/search-bar";
import { buildLoginRedirectPath } from "@/lib/auth";
import { loadUserAddresses, type CheckoutAddress } from "@/lib/address-service";
import { cn, formatPrice } from "@/lib/utils";
import { useWishlistStore } from "@/store/wishlist-store";
import { addValidatedCartItem } from "@/lib/cart-service";

type HomeProduct = {
  id: string;
  title: string;
  subtitle: string;
  categoryLabel: string;
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
  badge?: "new" | "bestseller" | "sale" | "exclusive";
  exclusiveOffer?: boolean;
  exclusiveOfferPercent?: number;
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

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
};

function toHomeProduct(product: CatalogProduct, badge: HomeProduct["badge"] = product.badge) {
  return {
    id: product.id,
    title: product.name,
    subtitle: product.brandName,
    categoryLabel: product.departmentSlug === "plumbing" ? "Plumbing" : "Paints",
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
    exclusiveOffer: product.exclusiveOffer ?? badge === "exclusive",
    exclusiveOfferPercent: product.exclusiveOfferPercent,
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

  return visibleProducts.slice(0, 4).map((product) => toHomeProduct(product, product.badge));
}

function CompactProductCard({ product }: { product: HomeProduct }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const isWishlisted = useWishlistStore((state) => state.has(product.id));
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const isOutOfStock = !product.inStock || (product.stockCount ?? 0) <= 0;
  const loginRedirect = buildLoginRedirectPath(pathname);
  const savePercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : null;

  const handleAdd = async () => {
    if (isOutOfStock) {
      return;
    }

    if (!isAuthenticated) {
      router.push(loginRedirect);
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
      <Card className="h-full overflow-hidden rounded-[1.75rem] border-white/80 bg-white/95 p-3 shadow-[var(--shadow-sm)]">
        <div className="relative">
          <Link
            href={product.href}
            aria-label={`View ${product.title}`}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <div className="relative aspect-[1.05] overflow-hidden rounded-[1.35rem] bg-[#f4efe8]">
              <Image
                src={product.image || FALLBACK_HOME_IMAGE}
                alt={product.title}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {savePercent ? (
                <span className="absolute left-3 bottom-3 rounded-full bg-[#d8b434] px-3 py-1.5 text-[11px] font-bold text-white shadow-[var(--shadow-sm)]">
                  {savePercent}% OFF
                </span>
              ) : null}
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!isAuthenticated) {
                    router.push(loginRedirect);
                    return;
                  }
                  toggleWishlist(product.id);
                }}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={isWishlisted}
                className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                <Heart className={cn("h-4 w-4", isWishlisted && "fill-danger text-danger")} />
              </button>
              {isOutOfStock ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Badge variant="neutral">Out of Stock</Badge>
                </div>
              ) : null}
            </div>

            <div className="px-1 py-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-[11px] font-bold uppercase tracking-[0.22em] text-muted">
                  {product.subtitle}
                </p>
                {product.rating && product.rating > 0 ? <div className="flex shrink-0 items-center gap-1 text-sm font-bold text-emerald-600">
                  <Star className="h-4 w-4 fill-emerald-600 text-emerald-600" />
                  <span>{product.rating.toFixed(1)}</span>
                </div> : null}
              </div>
              <h3 className="line-clamp-2 text-[1.05rem] font-black leading-[1.05] text-text">{product.title}</h3>

              <div className="mt-4 flex items-end gap-2">
                {product.compareAtPrice && product.compareAtPrice > product.price ? (
                  <span className="text-[0.95rem] font-semibold text-muted line-through">
                    {formatPrice(product.compareAtPrice)}
                  </span>
                ) : null}
                <span className="text-[1.05rem] font-black text-text">{formatPrice(product.price)}</span>
              </div>
            </div>
          </Link>
        </div>

        <div className="px-1 pb-1">
          <Button
            type="button"
            variant="outline"
            size="md"
            className="h-12 w-full justify-center rounded-full border-border/80 bg-white text-text shadow-[var(--shadow-sm)] hover:bg-white"
            onClick={() => void handleAdd()}
            aria-label={`Add ${product.title} to cart`}
            disabled={isOutOfStock}
          >
            <ShoppingCart className="h-4 w-4" />
            ADD
          </Button>
        </div>
      </Card>
    </motion.article>
  );
}

function HomeMarketplacePage({ products, featuredProducts }: HomeMarketplacePageProps) {
  const shouldReduceMotion = useReducedMotion();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [deliveryAddress, setDeliveryAddress] = useState<CheckoutAddress | null>(null);
  const [deliveryAddressLoading, setDeliveryAddressLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const homeProducts = useMemo(() => buildHomeProducts(products), [products]);
  const exclusiveOfferProducts = useMemo(
    () =>
      products
        .filter((product) => !isNoiseProduct(product) && product.exclusiveOffer)
        .sort((left, right) => (right.exclusiveOfferPercent ?? 0) - (left.exclusiveOfferPercent ?? 0))
        .slice(0, 4)
        .map((product) => toHomeProduct(product, "exclusive")),
    [products],
  );
  const featuredRailProducts = useMemo(
    () =>
      (featuredProducts.length > 0 ? featuredProducts : products.slice(0, 4))
        .filter((product) => !isNoiseProduct(product))
        .map((product, index) => toHomeProduct(product, index === 0 ? "bestseller" : product.badge)),
    [featuredProducts, products],
  );
  const heroProducts = useMemo(
    () =>
      (featuredProducts.length > 0 ? featuredProducts : products)
        .filter((product) => !isNoiseProduct(product))
        .slice(0, 4)
        .map((product, index) => toHomeProduct(product, index === 0 ? "bestseller" : product.badge)),
    [featuredProducts, products],
  );
  const displayHeroProducts = heroProducts.length > 0 ? heroProducts : homeProducts;
  const deliveryAddressLabel = deliveryAddress
    ? [deliveryAddress.line1, deliveryAddress.line2, deliveryAddress.city].filter(Boolean).join(", ") || `${deliveryAddress.city}, ${deliveryAddress.state}`
    : "Not available";
  const deliveryAddressSubtitle = deliveryAddress
    ? [deliveryAddress.city, deliveryAddress.state, deliveryAddress.pin].filter(Boolean).join(" • ")
    : "Save an address to see delivery details";
  const activeHeroProduct = displayHeroProducts[heroIndex] ?? displayHeroProducts[0] ?? homeProducts[0];

  useEffect(() => {
    let active = true;

    if (!user?.id) {
      setDeliveryAddress(null);
      setDeliveryAddressLoading(false);
      return () => {
        active = false;
      };
    }

    setDeliveryAddressLoading(true);

    void loadUserAddresses(user.id)
      .then((addresses) => {
        if (!active) {
          return;
        }
        setDeliveryAddress(addresses[0] ?? null);
      })
      .finally(() => {
        if (active) {
          setDeliveryAddressLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (displayHeroProducts.length <= 1) {
      setHeroIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % displayHeroProducts.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [displayHeroProducts.length]);

  useEffect(() => {
    if (heroIndex >= displayHeroProducts.length) {
      setHeroIndex(0);
    }
  }, [displayHeroProducts.length, heroIndex]);

  return (
    <motion.main
      className="relative isolate overflow-x-hidden border-b border-border pt-20 surface-texture sm:pt-24 lg:pt-28"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl" />
      </div>

      <div className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-[color:var(--color-background)]/96 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
          <SearchBar variant="home" placeholder="Search paints, putty, primer, waterproofing..." className="w-full" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <header className="space-y-4 pt-1">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={user ? "/account/addresses" : "/login"}
              className="group flex min-w-0 flex-1 items-start gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={deliveryAddress ? "View saved delivery address" : "Save address"}
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/85 text-muted shadow-[var(--shadow-sm)]">
                <MapPin className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Deliver to</span>
                <span className="mt-0.5 block truncate text-sm font-semibold text-text">
                  {deliveryAddressLoading || authLoading ? "Loading..." : deliveryAddressLabel}
                </span>
                <span className="block truncate text-[11px] font-medium text-muted">
                  {deliveryAddressLoading || authLoading ? "Checking your saved address" : deliveryAddressSubtitle}
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/notifications"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-white/90 text-text shadow-[var(--shadow-sm)]"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href={isAuthenticated ? "/wishlist" : buildLoginRedirectPath("/wishlist")}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-white/90 text-text shadow-[var(--shadow-sm)]"
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href={isAuthenticated ? "/account" : buildLoginRedirectPath("/account")}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-background-secondary text-sm font-bold text-text shadow-[var(--shadow-sm)]"
                aria-label="Account"
              >
                <UserCircle2 className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[0.95rem] font-black tracking-[0.5em] text-text sm:text-[1.05rem]">UNIQUE SHOPEE</p>
          </div>
        </header>

        <section className="mt-4">
          <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-gradient-to-br from-[#201b1a] via-[#7b6356] to-[#d6ab88] p-4 text-white shadow-[var(--shadow-lg)] sm:p-5">
            <div className="relative overflow-hidden rounded-[1.6rem] bg-white/10 p-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeHeroProduct?.id ?? "hero"}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="relative h-full overflow-hidden rounded-[1.6rem] bg-[#d7b197]/35"
                >
                  <Link href={activeHeroProduct?.href ?? "/products"} className="group block h-full">
                    <div className="relative aspect-[0.92] min-h-[20rem]">
                      <Image
                        src={activeHeroProduct?.image || FALLBACK_HOME_IMAGE}
                        alt={activeHeroProduct?.title ?? "Featured product"}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/12 to-transparent" />
                    </div>
                    <div className="absolute inset-x-4 top-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/90">Exclusive offer</p>
                    </div>
                    <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200">Hero pick</p>
                        <p className="max-w-[14rem] text-[1.2rem] font-black leading-[1.05] text-white sm:text-[1.35rem]">
                          {activeHeroProduct?.title}
                        </p>
                      </div>
                      <span className="rounded-full bg-white/15 px-3 py-2 text-xs font-semibold text-white">
                        {activeHeroProduct?.categoryLabel}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              </AnimatePresence>
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

        <section className="mt-6">
          <Card className="rounded-[1.6rem] border-rose-100 bg-rose-50/80 p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-text">Exclusive Offer</h2>
                  <Badge variant="danger" className="rounded-full px-2.5 py-1 text-[10px]">
                    LIVE
                  </Badge>
                </div>
                <p className="text-sm font-medium text-muted">Live admin-curated offers appear here when products are marked exclusive.</p>
              </div>
              <Button asChild variant="primary" size="sm" className="shrink-0">
                <Link href="/products">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {(exclusiveOfferProducts.length > 0 ? exclusiveOfferProducts : homeProducts).slice(0, 2).map((item) => (
                <div key={item.id} className="rounded-[1.2rem] bg-white p-2 shadow-[var(--shadow-sm)]">
                  <div className="relative aspect-square overflow-hidden rounded-[1rem] bg-background-secondary">
                    <Image src={item.image || FALLBACK_HOME_IMAGE} alt={item.title} fill className="object-cover" />
                    <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {item.exclusiveOfferPercent ? `${item.exclusiveOfferPercent}% OFF` : item.badge === "sale" && item.compareAtPrice ? "SALE" : "LIVE PICK"}
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
            <h2 className="text-lg font-bold text-text">Trending Now</h2>
            <Link href="/products" className="text-sm font-semibold text-accent">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {homeProducts.slice(0, 4).map((product) => (
              <CompactProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-text">Editor's Picks</h2>
            <Link href="/products" className="text-sm font-semibold text-accent">
              Browse all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {featuredRailProducts.slice(0, 4).map((product) => (
              <CompactProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </div>
    </motion.main>
  );
}

export { HomeMarketplacePage };
