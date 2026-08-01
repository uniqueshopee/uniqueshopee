"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgePercent,
  ChevronDown,
  Copy,
  Heart,
  Minus,
  MoreVertical,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn, formatPrice } from "@/lib/utils";
import { calculateCartPricing, defaultShippingResolver, resolveCouponCode, type CouponCode } from "@/lib/checkout-pricing";
import { useCartSync } from "@/components/cart/cart-sync-provider";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";
import { toast } from "@/hooks/use-toast";

type DeliveryResult = {
  text: string;
  cod: boolean;
};

type VariantMap = Record<string, string>;

const SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.04, delayChildren: 0.03 },
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

function getSavePercent(product: Product) {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) {
    return null;
  }

  return Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100);
}

function getVariantOptions(category: string) {
  if (category.toLowerCase().includes("paint")) {
    return ["Standard Finish", "Premium Finish", "Bulk Pack"];
  }

  if (category.toLowerCase().includes("tool")) {
    return ["Standard Kit", "Pro Kit", "Combo Pack"];
  }

  return ["Standard", "Value Pack", "Trade Pack"];
}

function CartItemActionButton({
  children,
  onClick,
  variant = "outline",
  icon,
  ariaLabel,
}: {
  children: string;
  onClick?: () => void;
  variant?: "outline" | "ghost" | "accent";
  icon?: ReactNode;
  ariaLabel?: string;
}) {
  const className = cn(
    "justify-start rounded-full px-3 py-2 text-xs font-semibold",
    variant === "accent" && "bg-accent text-accent-foreground hover:bg-accent/90",
    variant === "outline" && "border-border/70 bg-white/80 text-text hover:border-accent/20 hover:bg-white",
    variant === "ghost" && "border-transparent bg-transparent text-text hover:bg-background-secondary",
  );

  return (
    <Button
      type="button"
      variant={variant === "accent" ? "accent" : variant === "ghost" ? "ghost" : "outline"}
      size="sm"
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {icon}
      {children}
    </Button>
  );
}

function CartLineItem({
  product,
  quantity,
  selectedVariant,
  maxQuantity,
  onQuantityChange,
  onVariantChange,
  onRemove,
  onMoveToWishlist,
  onShare,
  onSaveForLater,
  codAvailable,
}: {
  product: Product;
  quantity: number;
  selectedVariant: string;
  maxQuantity?: number;
  onQuantityChange: (nextQuantity: number) => void;
  onVariantChange: (variant: string) => void;
  onRemove: () => void;
  onMoveToWishlist: () => void;
  onShare: () => void;
  onSaveForLater: () => void;
  codAvailable: boolean;
}) {
  const savePercent = getSavePercent(product);
  const variants = getVariantOptions(product.category);
  const originalPrice = product.compareAtPrice ?? product.price;
  const stockCount = product.stockCount ?? 0;
  const lowStockThreshold = product.lowStockThreshold ?? 10;
  const stockLabel =
    !product.inStock || stockCount <= 0
      ? "Out of stock"
      : stockCount <= lowStockThreshold
        ? stockCount === 1
          ? "Only 1 left"
          : `Only ${stockCount} left`
        : "In stock";

  return (
    <motion.article
      variants={ITEM_VARIANTS}
      className="overflow-hidden rounded-[1.35rem] border border-white/75 bg-white/95 shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-base)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]"
    >
      <div className="lg:hidden">
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-background-secondary via-white to-background-secondary">
          <Image src={product.image} alt={product.name} fill sizes="50vw" className="object-cover" />
          {!product.inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/65">
              <Badge variant="neutral" className="text-[10px]">
                Out of stock
              </Badge>
            </div>
          )}
        </div>

        <div className="space-y-2 p-3">
          <h3 className="line-clamp-2 text-xs font-bold leading-5 text-text">{product.name}</h3>

          <div className="flex items-baseline gap-1.5">
            <p className="text-sm font-bold text-text">{formatPrice(product.price)}</p>
            {originalPrice > product.price && <span className="text-[11px] font-medium text-muted line-through">{formatPrice(originalPrice)}</span>}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex h-8 items-center overflow-hidden rounded-full border border-border/70 bg-white/90 shadow-[var(--shadow-sm)]">
              <button
                type="button"
                aria-label={`Decrease quantity of ${product.name}`}
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity === 1}
                className="flex h-8 w-8 items-center justify-center text-text transition-colors hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <motion.span
                key={quantity}
                initial={{ opacity: 0.4, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="min-w-8 px-2 text-center text-xs font-bold text-text"
              >
                {quantity}
              </motion.span>
              <button
                type="button"
                aria-label={`Increase quantity of ${product.name}`}
                onClick={() => onQuantityChange(maxQuantity ? Math.min(maxQuantity, quantity + 1) : quantity + 1)}
                disabled={typeof maxQuantity === "number" ? quantity >= maxQuantity : false}
                className="flex h-8 w-8 items-center justify-center text-text transition-colors hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${product.name} from cart`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-white/90 text-text shadow-[var(--shadow-sm)] transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="grid gap-3 p-3 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-4 sm:p-4">
          <div className="relative aspect-square overflow-hidden rounded-[1.15rem] border border-border/70 bg-gradient-to-br from-background-secondary via-white to-background-secondary">
            <Image src={product.image} alt={product.name} fill sizes="96px" className="object-cover" />
            {!product.inStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/65">
                <Badge variant="neutral">Out of stock</Badge>
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{product.category}</p>
                <h3 className="line-clamp-2 text-sm font-bold leading-6 text-text sm:text-base">{product.name}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={stockLabel === "In stock" ? "success" : stockLabel === "Out of stock" ? "neutral" : "warning"}
                    className="text-[10px] uppercase tracking-[0.16em]"
                  >
                    {stockLabel}
                  </Badge>
                  <Badge variant="accent" className="text-[10px] uppercase tracking-[0.16em]">
                    {selectedVariant}
                  </Badge>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-lg font-bold text-text sm:text-xl">{formatPrice(product.price)}</p>
                <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
                  {originalPrice > product.price && (
                    <span className="text-xs font-medium text-muted line-through">{formatPrice(originalPrice)}</span>
                  )}
                  {savePercent && (
                    <Badge variant="success" className="text-[10px] uppercase tracking-[0.16em]">
                      Save {savePercent}%
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_auto] sm:items-end">
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Variant</span>
                <select
                  aria-label={`Select variant for ${product.name}`}
                  value={selectedVariant}
                  onChange={(event) => onVariantChange(event.target.value)}
                  className="h-10 w-full rounded-full border border-border/70 bg-white/90 px-3.5 text-sm font-semibold text-text outline-none transition-colors focus:border-accent/25"
                >
                  {variants.map((variant) => (
                    <option key={variant} value={variant}>
                      {variant}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Quantity</span>
                <div className="inline-flex h-10 items-center overflow-hidden rounded-full border border-border/70 bg-white/90 shadow-[var(--shadow-sm)]">
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${product.name}`}
                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                    disabled={quantity === 1}
                    className="flex h-10 w-10 items-center justify-center text-text transition-colors hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <motion.span
                    key={quantity}
                    initial={{ opacity: 0.4, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="min-w-10 px-2.5 text-center text-sm font-bold text-text"
                  >
                    {quantity}
                  </motion.span>
                  <button
                    type="button"
                    aria-label={`Increase quantity of ${product.name}`}
                    onClick={() => onQuantityChange(maxQuantity ? Math.min(maxQuantity, quantity + 1) : quantity + 1)}
                    disabled={typeof maxQuantity === "number" ? quantity >= maxQuantity : false}
                    className="flex h-10 w-10 items-center justify-center text-text transition-colors hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="text-[11px] font-medium text-muted">{codAvailable ? "COD available" : "COD unavailable"}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <CartItemActionButton variant="accent" icon={<Trash2 className="h-4 w-4" aria-hidden="true" />} onClick={onRemove}>
                Remove
              </CartItemActionButton>

              <details className="relative">
                <summary className="flex h-10 w-10 list-none items-center justify-center rounded-full border border-border/70 bg-white/90 text-text shadow-[var(--shadow-sm)] transition-colors hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                </summary>
                <div className="absolute right-0 top-12 z-20 w-52 overflow-hidden rounded-[1.1rem] border border-border/70 bg-white/98 p-1 shadow-[var(--shadow-lg)]">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[0.9rem] px-3 py-2.5 text-sm font-medium text-text hover:bg-background-secondary"
                    onClick={onMoveToWishlist}
                  >
                    <Heart className="h-4 w-4" aria-hidden="true" />
                    Move to Wishlist
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[0.9rem] px-3 py-2.5 text-sm font-medium text-text hover:bg-background-secondary"
                    onClick={onSaveForLater}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Save for Later
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[0.9rem] px-3 py-2.5 text-sm font-medium text-text hover:bg-background-secondary"
                    onClick={onShare}
                  >
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                    Share
                  </button>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function SummaryRow({
  label,
  value,
  emphasize = false,
  strike = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  strike?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={cn("font-medium", emphasize ? "text-text" : "text-muted")}>{label}</span>
      <span className={cn("font-bold", emphasize ? "text-lg text-text" : "text-text", strike && "line-through text-muted")}>
        {value}
      </span>
    </div>
  );
}

function OrderSummaryCard({
  subtotal,
  discount,
  gst,
  shipping,
  couponDiscount,
  total,
  appliedCoupon,
  onProceed,
}: {
  subtotal: number;
  discount: number;
  gst: number;
  shipping: number;
  couponDiscount: number;
  total: number;
  appliedCoupon: string | null;
  onProceed: () => void;
}) {
  return (
    <Card className="rounded-[1.35rem] border-white/75 bg-white/95 p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
        <h3 className="text-base font-bold text-text">Order Summary</h3>
      </div>

      <div className="space-y-2.5">
        <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
        <SummaryRow label="Discount" value={`- ${formatPrice(discount)}`} />
        <SummaryRow label="Shipping" value={shipping === 0 ? "Free" : formatPrice(shipping)} />
        <SummaryRow label="GST" value={formatPrice(gst)} />
        <SummaryRow label="Coupon Discount" value={couponDiscount > 0 ? `- ${formatPrice(couponDiscount)}` : formatPrice(0)} />
        <div className="border-t border-border/70 pt-3">
          <SummaryRow label="Grand Total" value={formatPrice(total)} emphasize />
        </div>
      </div>

      {appliedCoupon && (
        <div className="mt-3 rounded-[1rem] border border-success/20 bg-success/10 px-3 py-2.5 text-sm font-medium text-success">
          Coupon {appliedCoupon} applied successfully.
        </div>
      )}

      <Button variant="primary" size="lg" className="mt-4 w-full" onClick={onProceed}>
        Proceed to Checkout
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </Card>
  );
}

function CartPageShell() {
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const { mode, loaded, mergeAvailable, guestItemCount, mergeGuestCart, dismissGuestMerge, syncError, retrySync } = useCartSync();
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const totalItems = useCartStore((state) => state.totalItems());
  const couponCode = useCartStore((state) => state.couponCode);
  const setCouponCode = useCartStore((state) => state.setCouponCode);
  const wishlistHas = useWishlistStore((state) => state.has);
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const [couponInput, setCouponInput] = useState("");
  const [couponMessage, setCouponMessage] = useState<string>("");
  const [pincode, setPincode] = useState("");
  const [deliveryResult, setDeliveryResult] = useState<DeliveryResult>({
    text: "Delivery in 2-4 days",
    cod: true,
  });
  const [selectedVariants, setSelectedVariants] = useState<VariantMap>({});

  const cartLineItems = useMemo(
    () =>
      items.map((item) => {
        const product = {
          id: item.productId,
          name: item.name,
          price: item.price,
          image: item.image || "/images/placeholders/department-plumbing.svg",
          category: item.category ?? "",
          compareAtPrice: item.compareAtPrice,
          inStock: item.inStock ?? true,
          stockCount: item.stockCount,
          reservedCount: item.reservedCount,
          lowStockThreshold: item.lowStockThreshold,
          slug: item.slug ?? item.productId,
          sku: item.productId,
          rating: undefined,
          reviewCount: undefined,
          badge: undefined,
        } satisfies Product;

        return {
          item,
          product,
          maxQuantity: item.stockCount,
        };
      }),
    [items],
  );

  const pricing = useMemo(
    () => calculateCartPricing(items, couponCode, defaultShippingResolver, (item) => item.compareAtPrice ?? item.price),
    [couponCode, items],
  );

  const handleApplyCoupon = () => {
    const code = resolveCouponCode(couponInput);
    if (code) {
      setCouponCode(code as CouponCode);
      setCouponMessage(`${code} applied successfully.`);
      toast({ title: "Coupon applied", description: `${code} saved on your order.`, variant: "success" });
      return;
    }

    setCouponCode(null);
    setCouponMessage("Enter a coupon code to continue.");
    toast({ title: "Coupon cleared", description: "Enter a coupon code to continue." });
  };

  const handleCheckDelivery = () => {
    const cleanPincode = pincode.trim();
    if (!/^\d{6}$/.test(cleanPincode)) {
      setDeliveryResult({ text: "Enter a valid 6-digit pincode", cod: false });
      return;
    }

    const leadDigit = Number(cleanPincode[0]);
    const text = leadDigit <= 3 ? "Delivery in 2-4 days" : leadDigit <= 6 ? "Delivery in 3-5 days" : "Delivery in 4-6 days";
    setDeliveryResult({ text, cod: true });
    toast({ title: "Delivery checked", description: `${text}. Cash on Delivery is available.` });
  };

  const handleMoveToWishlist = (product: Product) => {
    if (!wishlistHas(product.id)) {
      toggleWishlist(product.id);
    }
    removeItem(product.id);
    toast({
      title: "Moved to wishlist",
      description: `${product.name} was removed from cart and saved to your wishlist.`,
      variant: "success",
    });
  };

  const handleProceedToCheckout = () => {
    router.push("/checkout");
  };

  const handleShare = async (product: Product) => {
    const url = `${window.location.origin}/product/${product.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on UniqueShopee.`,
          url,
        });
        return;
      } catch {
        // fallback below
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
    }

    toast({ title: "Share link copied", description: "You can paste it anywhere now." });
  };

  const empty = items.length === 0;

  useEffect(() => {
    setCouponInput(couponCode ?? "");
  }, [couponCode]);

  if (!loaded) {
    return (
      <section className="relative isolate overflow-hidden border-b border-border surface-texture">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
          <div className="animate-pulse space-y-4 rounded-[1.75rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
            <div className="h-4 w-28 rounded-full bg-background-secondary" />
            <div className="h-10 w-56 rounded-2xl bg-background-secondary" />
            <div className="h-5 w-2/3 rounded-full bg-background-secondary" />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-4">
                <div className="h-40 rounded-[1.5rem] bg-background-secondary" />
                <div className="h-40 rounded-[1.5rem] bg-background-secondary" />
              </div>
              <div className="h-72 rounded-[1.5rem] bg-background-secondary" />
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

      <div className="relative mx-auto max-w-7xl px-4 pb-40 pt-6 sm:px-6 sm:pb-44 sm:pt-8 lg:pb-14">
        <motion.nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-sm font-medium text-muted" variants={ITEM_VARIANTS}>
          <Link href="/" className="transition-colors hover:text-text">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-text">Cart</span>
        </motion.nav>

        <motion.header
          className="mb-5 rounded-[1.5rem] border border-white/80 bg-white/92 p-4 shadow-[var(--shadow-lg)] sm:p-5"
          variants={ITEM_VARIANTS}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent" className="eyebrow-font">
                  Shopping Cart
                </Badge>
                <Badge variant="neutral" className="eyebrow-font">
                  {totalItems} Item{totalItems === 1 ? "" : "s"}
                </Badge>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-text sm:text-3xl">Shopping Cart</h1>
              <p className="mt-2 text-sm font-medium text-muted sm:text-base">Review, adjust, and check out faster.</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="shrink-0 px-2 text-accent">
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </div>
        </motion.header>

        {mode === "authenticated" && mergeAvailable && (
          <Card className="mb-5 rounded-[1.35rem] border border-accent/20 bg-gradient-to-r from-accent/10 via-white to-white p-4 shadow-[var(--shadow-sm)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-text">Guest cart detected</p>
                <p className="mt-1 text-sm font-medium text-muted">
                  {guestItemCount} saved guest item{guestItemCount === 1 ? "" : "s"} can be merged into your account.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="accent" size="sm" onClick={() => void mergeGuestCart()}>
                  Merge Guest Cart
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={dismissGuestMerge}>
                  Dismiss
                </Button>
              </div>
            </div>
          </Card>
        )}

        {syncError ? (
          <Card className="mb-5 rounded-[1.35rem] border border-warning/20 bg-warning/10 p-4 shadow-[var(--shadow-sm)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-text">Cart sync needs another try</p>
                <p className="mt-1 text-sm font-medium text-muted">{syncError}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={retrySync}>
                Retry Sync
              </Button>
            </div>
          </Card>
        ) : null}

        {empty ? (
          <motion.div className="space-y-5" variants={SECTION_VARIANTS}>
            <motion.div
              variants={ITEM_VARIANTS}
              className="rounded-[1.5rem] border border-white/80 bg-white/92 p-6 text-center shadow-[var(--shadow-lg)]"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-border/70 bg-white/90 shadow-[var(--shadow-sm)]">
                <ShoppingCart className="h-7 w-7 text-accent" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-text">Your cart is empty</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-7 text-muted">
                Add premium products from our Paint and Plumbing catalog to start building your order.
              </p>
              <Button asChild variant="primary" size="md" className="mt-5">
                <Link href="/products">
                  Continue Shopping
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
              {cartLineItems.map(({ item, product, maxQuantity }) => {
                const selectedVariant = selectedVariants[product.id] ?? getVariantOptions(product.category)[0] ?? "Standard";

                return (
                  <CartLineItem
                    key={product.id}
                    product={product}
                    quantity={item.quantity}
                    selectedVariant={selectedVariant}
                    maxQuantity={maxQuantity}
                    onQuantityChange={(nextQuantity) =>
                      updateQuantity(item.productId, Math.max(1, maxQuantity ? Math.min(maxQuantity, nextQuantity) : nextQuantity))
                    }
                    onVariantChange={(variant) =>
                      setSelectedVariants((current) => ({
                        ...current,
                        [product.id]: variant,
                      }))
                    }
                    onRemove={() => removeItem(item.productId)}
                    onMoveToWishlist={() => handleMoveToWishlist(product)}
                    onShare={() => handleShare(product)}
                    onSaveForLater={() =>
                      toast({
                        title: "Save for later coming soon",
                        description: "This placeholder will connect to a saved-for-later shelf later.",
                      })
                    }
                    codAvailable={deliveryResult.cod}
                  />
                );
              })}

              <details className="rounded-[1.35rem] border border-white/80 bg-white/92 shadow-[var(--shadow-sm)]" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-bold text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <span className="inline-flex items-center gap-2">
                    <BadgePercent className="h-4 w-4 text-accent" aria-hidden="true" />
                    Have a coupon?
                  </span>
                  <span className="inline-flex items-center gap-1 text-accent">
                    Apply Coupon
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </span>
                </summary>
                <div className="px-4 pb-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Input
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value)}
                      placeholder="Coupon Code"
                      aria-label="Coupon Code"
                      className="h-11 rounded-full border-border/80 bg-white/90"
                    />
                    <Button type="button" variant="accent" size="md" onClick={handleApplyCoupon}>
                      Apply
                    </Button>
                  </div>
                  {couponMessage && (
                    <p className={cn("mt-3 text-sm font-medium", couponCode ? "text-success" : "text-muted")}>{couponMessage}</p>
                  )}
                </div>
              </details>

              <Card className="rounded-[1.35rem] border-white/75 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
                <div className="mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-accent" aria-hidden="true" />
                  <h2 className="text-base font-bold text-text">Delivery Check</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    value={pincode}
                    onChange={(event) => setPincode(event.target.value)}
                    placeholder="Pincode"
                    aria-label="Pincode"
                    maxLength={6}
                    inputMode="numeric"
                    className="h-11 rounded-full border-border/80 bg-white/90"
                  />
                  <Button type="button" variant="primary" size="md" onClick={handleCheckDelivery}>
                    Check Delivery
                  </Button>
                </div>
                <div className="mt-3 grid gap-2 rounded-[1rem] border border-border/70 bg-background-secondary/35 p-3 text-sm">
                  <p className="font-bold text-text">{deliveryResult.text}</p>
                  <p className="font-medium text-muted">{deliveryResult.cod ? "COD Available" : "Enter a 6-digit pincode to check delivery."}</p>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <div className="hidden lg:block lg:sticky lg:top-24">
                <OrderSummaryCard
                  subtotal={pricing.subtotal}
                  discount={pricing.discount}
                  gst={pricing.gst}
                  shipping={pricing.shipping}
                  couponDiscount={pricing.couponDiscount}
                  total={pricing.grandTotal}
                  appliedCoupon={couponCode}
                  onProceed={handleProceedToCheckout}
                />
              </div>

              <details className="rounded-[1.35rem] border border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)] lg:hidden" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
                    Order Summary
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
                </summary>
                <div className="mt-4">
                  <OrderSummaryCard
                    subtotal={pricing.subtotal}
                    discount={pricing.discount}
                    gst={pricing.gst}
                    shipping={pricing.shipping}
                    couponDiscount={pricing.couponDiscount}
                    total={pricing.grandTotal}
                    appliedCoupon={couponCode}
                    onProceed={handleProceedToCheckout}
                  />
                </div>
              </details>
            </div>
          </div>
        )}
      </div>

      {!empty && (
        <motion.div
          className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 px-3 lg:hidden"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mx-auto max-w-2xl rounded-[1.3rem] border border-border/70 bg-white/98 px-3 py-2 shadow-[var(--shadow-lg)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2.5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Grand Total</p>
                <p className="text-[1.05rem] font-bold text-text">{formatPrice(pricing.grandTotal)}</p>
              </div>
              <Button variant="primary" size="md" onClick={handleProceedToCheckout} className="h-11 px-4">
                Proceed to Checkout
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}

function CartPage() {
  return <CartPageShell />;
}

export { CartPage };
