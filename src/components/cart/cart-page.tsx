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
import type { CartItem, Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn, formatPrice } from "@/lib/utils";
import {
  calculateCartPricing,
  resolveCouponCode,
  type CouponCode,
} from "@/lib/checkout-pricing";
import { useCartSync } from "@/components/cart/cart-sync-provider";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";
import { toast } from "@/hooks/use-toast";
import { buildCartItemKey } from "@/lib/variant-pricing";
import { checkDeliveryPincode, getConfiguredShippingAmount, getResolvedCartTaxableAmount, INVALID_PINCODE_MESSAGE, loadFreeDeliveryConfig, UNAVAILABLE_PINCODE_MESSAGE, type FreeDeliveryConfig } from "@/lib/delivery-service";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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

function getSavePercent(product: Product) {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) {
    return null;
  }

  return Math.round(
    ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100,
  );
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
    variant === "outline" &&
      "border-border/70 bg-white/80 text-text hover:border-accent/20 hover:bg-white",
    variant === "ghost" &&
      "border-transparent bg-transparent text-text hover:bg-background-secondary",
  );

  return (
    <Button
      type="button"
      variant={
        variant === "accent" ? "accent" : variant === "ghost" ? "ghost" : "outline"
      }
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
  codAvailable,
  shadeName,
  shadeCode,
  shadeFamily,
  shadeHexColor,
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
  codAvailable: boolean;
  shadeName?: string;
  shadeCode?: string;
  shadeFamily?: string;
  shadeHexColor?: string;
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
        <div className="from-background-secondary to-background-secondary relative aspect-square overflow-hidden bg-gradient-to-br via-white">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="50vw"
            className="object-cover"
          />
          {!product.inStock && (
            <div className="bg-background/65 absolute inset-0 flex items-center justify-center">
              <Badge variant="neutral" className="text-[10px]">
                Out of stock
              </Badge>
            </div>
          )}
        </div>

        <div className="space-y-2 p-3">
          <h3 className="text-text line-clamp-2 text-xs leading-5 font-bold">
            {product.name}
          </h3>
          {shadeName ? (
            <div className="flex items-center gap-2 rounded-lg bg-background-secondary/60 px-2 py-1.5">
              <span className="h-5 w-5 shrink-0 rounded-full border-2 border-white shadow-[var(--shadow-sm)]" style={{ backgroundColor: shadeHexColor || "#cbd5e1" }} aria-label={`Selected shade ${shadeName}`} role="img" />
              <span className="min-w-0 truncate text-[10px] font-semibold text-text">{shadeName}{shadeCode ? ` · ${shadeCode}` : ""}{shadeFamily ? <span className="block truncate font-medium text-muted">{shadeFamily}</span> : null}</span>
            </div>
          ) : null}

          <div className="flex items-baseline gap-1.5">
            <p className="text-text text-sm font-bold">{formatPrice(product.price)}</p>
            {originalPrice > product.price && (
              <span className="text-muted text-[11px] font-medium line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="border-border/70 inline-flex h-8 items-center overflow-hidden rounded-full border bg-white/90 shadow-[var(--shadow-sm)]">
              <button
                type="button"
                aria-label={`Decrease quantity of ${product.name}`}
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity === 1}
                className="text-text hover:bg-background-secondary focus-visible:ring-accent flex h-8 w-8 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <motion.span
                key={quantity}
                initial={{ opacity: 0.4, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="text-text min-w-8 px-2 text-center text-xs font-bold"
              >
                {quantity}
              </motion.span>
              <button
                type="button"
                aria-label={`Increase quantity of ${product.name}`}
                onClick={() =>
                  onQuantityChange(
                    maxQuantity ? Math.min(maxQuantity, quantity + 1) : quantity + 1,
                  )
                }
                disabled={
                  typeof maxQuantity === "number" ? quantity >= maxQuantity : false
                }
                className="text-text hover:bg-background-secondary focus-visible:ring-accent flex h-8 w-8 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${product.name} from cart`}
              className="border-border/70 text-text focus-visible:ring-accent flex h-8 w-8 items-center justify-center rounded-full border bg-white/90 shadow-[var(--shadow-sm)] transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-2 focus-visible:outline-none"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="grid gap-3 p-3 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-4 sm:p-4">
          <div className="border-border/70 from-background-secondary to-background-secondary relative aspect-square overflow-hidden rounded-[1.15rem] border bg-gradient-to-br via-white">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="96px"
              className="object-cover"
            />
            {!product.inStock && (
              <div className="bg-background/65 absolute inset-0 flex items-center justify-center">
                <Badge variant="neutral">Out of stock</Badge>
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <p className="text-muted text-[11px] font-semibold tracking-[0.18em] uppercase">
                  {product.category}
                </p>
                <h3 className="text-text line-clamp-2 text-sm leading-6 font-bold sm:text-base">
                  {product.name}
                </h3>
                {shadeName ? (
                  <div className="flex items-center gap-2 rounded-lg bg-background-secondary/60 px-2 py-1.5">
                    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-white shadow-[var(--shadow-sm)]" style={{ backgroundColor: shadeHexColor || "#cbd5e1" }} aria-label={`Selected shade ${shadeName}`} role="img" />
                    <span className="min-w-0 truncate text-[10px] font-semibold text-text">{shadeName}{shadeCode ? ` · ${shadeCode}` : ""}{shadeFamily ? <span className="block truncate font-medium text-muted">{shadeFamily}</span> : null}</span>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      stockLabel === "In stock"
                        ? "success"
                        : stockLabel === "Out of stock"
                          ? "neutral"
                          : "warning"
                    }
                    className="text-[10px] tracking-[0.16em] uppercase"
                  >
                    {stockLabel}
                  </Badge>
                  <Badge
                    variant="accent"
                    className="text-[10px] tracking-[0.16em] uppercase"
                  >
                    {selectedVariant}
                  </Badge>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-text text-lg font-bold sm:text-xl">
                  {formatPrice(product.price)}
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
                  {originalPrice > product.price && (
                    <span className="text-muted text-xs font-medium line-through">
                      {formatPrice(originalPrice)}
                    </span>
                  )}
                  {savePercent && (
                    <Badge
                      variant="success"
                      className="text-[10px] tracking-[0.16em] uppercase"
                    >
                      Save {savePercent}%
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_auto] sm:items-end">
              <label className="space-y-1.5">
                <span className="text-muted text-[11px] font-semibold tracking-[0.18em] uppercase">
                  Variant
                </span>
                <select
                  aria-label={`Select variant for ${product.name}`}
                  value={selectedVariant}
                  onChange={(event) => onVariantChange(event.target.value)}
                  className="border-border/70 text-text focus:border-accent/25 h-10 w-full rounded-full border bg-white/90 px-3.5 text-sm font-semibold transition-colors outline-none"
                >
                  {variants.map((variant) => (
                    <option key={variant} value={variant}>
                      {variant}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-1.5">
                <span className="text-muted text-[11px] font-semibold tracking-[0.18em] uppercase">
                  Quantity
                </span>
                <div className="border-border/70 inline-flex h-10 items-center overflow-hidden rounded-full border bg-white/90 shadow-[var(--shadow-sm)]">
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${product.name}`}
                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                    disabled={quantity === 1}
                    className="text-text hover:bg-background-secondary focus-visible:ring-accent flex h-10 w-10 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <motion.span
                    key={quantity}
                    initial={{ opacity: 0.4, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="text-text min-w-10 px-2.5 text-center text-sm font-bold"
                  >
                    {quantity}
                  </motion.span>
                  <button
                    type="button"
                    aria-label={`Increase quantity of ${product.name}`}
                    onClick={() =>
                      onQuantityChange(
                        maxQuantity ? Math.min(maxQuantity, quantity + 1) : quantity + 1,
                      )
                    }
                    disabled={
                      typeof maxQuantity === "number" ? quantity >= maxQuantity : false
                    }
                    className="text-text hover:bg-background-secondary focus-visible:ring-accent flex h-10 w-10 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="text-muted text-[11px] font-medium">
                  {codAvailable ? "COD available" : "COD unavailable"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <CartItemActionButton
                variant="accent"
                icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                onClick={onRemove}
              >
                Remove
              </CartItemActionButton>

              <details className="relative">
                <summary className="border-border/70 text-text hover:bg-background-secondary focus-visible:ring-accent flex h-10 w-10 list-none items-center justify-center rounded-full border bg-white/90 shadow-[var(--shadow-sm)] transition-colors focus-visible:ring-2 focus-visible:outline-none">
                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                </summary>
                <div className="border-border/70 absolute top-12 right-0 z-20 w-52 overflow-hidden rounded-[1.1rem] border bg-white/98 p-1 shadow-[var(--shadow-lg)]">
                  <button
                    type="button"
                    className="text-text hover:bg-background-secondary flex w-full items-center gap-3 rounded-[0.9rem] px-3 py-2.5 text-sm font-medium"
                    onClick={onMoveToWishlist}
                  >
                    <Heart className="h-4 w-4" aria-hidden="true" />
                    Move to Wishlist
                  </button>
                  <button
                    type="button"
                    className="text-text hover:bg-background-secondary flex w-full items-center gap-3 rounded-[0.9rem] px-3 py-2.5 text-sm font-medium"
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
      <span className={cn("font-medium", emphasize ? "text-text" : "text-muted")}>
        {label}
      </span>
      <span
        className={cn(
          "font-bold",
          emphasize ? "text-text text-lg" : "text-text",
          strike && "text-muted line-through",
        )}
      >
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
  shipping: number | null;
  couponDiscount: number;
  total: number | null;
  appliedCoupon: string | null;
  onProceed: () => void;
}) {
  return (
    <Card className="rounded-[1.35rem] border-white/75 bg-white/95 p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="text-accent h-4 w-4" aria-hidden="true" />
        <h3 className="text-text text-base font-bold">Order Summary</h3>
      </div>

      <div className="space-y-2.5">
        <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
        <SummaryRow label="Discount" value={`- ${formatPrice(discount)}`} />
        <SummaryRow
          label="Shipping"
          value={shipping === null ? "Unavailable" : shipping === 0 ? "Free" : formatPrice(shipping)}
        />
        <SummaryRow label="GST" value={formatPrice(gst)} />
        <SummaryRow
          label="Coupon Discount"
          value={couponDiscount > 0 ? `- ${formatPrice(couponDiscount)}` : formatPrice(0)}
        />
        <div className="border-border/70 border-t pt-3">
          <SummaryRow label="Grand Total" value={total === null ? "Unavailable" : formatPrice(total)} emphasize />
        </div>
      </div>

      {appliedCoupon && (
        <div className="border-success/20 bg-success/10 text-success mt-3 rounded-[1rem] border px-3 py-2.5 text-sm font-medium">
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

function FreeDeliveryProgress({
  config,
  qualifyingAmount,
  itemCount,
}: {
  config: FreeDeliveryConfig;
  qualifyingAmount: number;
  itemCount: number;
}) {
  if (!config.enabled || itemCount === 0) return null;

  const progress = Math.min(Math.max((qualifyingAmount / config.threshold) * 100, 0), 100);
  const unlocked = qualifyingAmount >= config.threshold;
  const remaining = Math.max(config.threshold - qualifyingAmount, 0);

  return (
    <motion.div
      className="mb-5 overflow-hidden rounded-[1.45rem] bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-4 text-white shadow-[0_14px_32px_rgba(37,99,235,0.24)] sm:p-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="min-w-0 flex-1">
          <p className="text-base font-black tracking-tight sm:text-xl">
            {unlocked ? "🎉 FREE DELIVERY UNLOCKED!" : `Add ${formatPrice(remaining)} more to unlock FREE DELIVERY`}
          </p>
          <p className="mt-1 text-sm font-semibold text-white/90 sm:text-base">
            {formatPrice(qualifyingAmount)} / {formatPrice(config.threshold)}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-950/35" aria-label={`${Math.round(progress)}% free delivery progress`} role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={Math.round(progress)}>
            <motion.div
              className="h-full rounded-full bg-cyan-300"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p className="text-xs font-black tracking-[0.16em] uppercase">Cart</p>
            <p className="text-xs font-bold sm:text-sm">{itemCount} {itemCount === 1 ? "Item" : "Items"}</p>
          </div>
          <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
        </div>
      </div>
    </motion.div>
  );
}

function CartPageShell() {
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const {
    mode,
    loaded,
    mergeAvailable,
    guestItemCount,
    mergeGuestCart,
    dismissGuestMerge,
    syncError,
    retrySync,
    flushSync,
  } = useCartSync();
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
    text: "Enter a 6-digit pincode to check delivery.",
    cod: false,
  });
  const [deliveryChecking, setDeliveryChecking] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<VariantMap>({});
  const [freeDeliveryConfig, setFreeDeliveryConfig] = useState<FreeDeliveryConfig | null>(null);

  const cartLineItems = useMemo(
    () =>
      items.map((item) => {
        const product = {
          id: item.productId,
          name: item.name,
          price: item.finalUnitPrice ?? item.price,
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
          key: item.variantId ?? item.productId,
        };
      }),
    [items],
  );

  const pricing = useMemo(
    () =>
      calculateCartPricing(
        items.map((item) => {
          const basePrice = item.basePrice ?? item.price;
          const resolvedPrice = item.finalUnitPrice ?? item.price;
          const resolvedBasePrice = resolvedPrice < basePrice ? resolvedPrice : basePrice;
          return {
            ...item,
            sellingPrice: resolvedBasePrice,
            shadeExtraPrice: Math.max(resolvedPrice - resolvedBasePrice, 0),
            adjustmentType: "fixed" as const,
          };
        }),
        couponCode,
        () => 0,
        (item) => item.compareAtPrice ?? item.price,
      ),
    [couponCode, items],
  );

  const handleApplyCoupon = () => {
    const code = resolveCouponCode(couponInput);
    if (code) {
      setCouponCode(code as CouponCode);
      setCouponMessage(`${code} applied successfully.`);
      toast({
        title: "Coupon applied",
        description: `${code} saved on your order.`,
        variant: "success",
      });
      return;
    }

    setCouponCode(null);
    setCouponMessage("Enter a coupon code to continue.");
    toast({ title: "Coupon cleared", description: "Enter a coupon code to continue." });
  };

  const handleCheckDelivery = async () => {
    setDeliveryChecking(true);
    const result = await checkDeliveryPincode(getSupabaseBrowserClient(), pincode);
    setDeliveryChecking(false);

    if (result.error && !result.isValid) {
      setDeliveryResult({ text: INVALID_PINCODE_MESSAGE, cod: false });
      return;
    }
    if (result.error) {
      setDeliveryResult({ text: "Unable to check delivery right now.", cod: false });
      toast({ title: "Delivery check failed", description: result.error, variant: "danger" });
      return;
    }
    if (!result.isServiceable) {
      setDeliveryResult({ text: UNAVAILABLE_PINCODE_MESSAGE, cod: false });
      return;
    }

    const leadDigit = Number(result.normalizedPincode[0]);
    const estimate = leadDigit <= 3 ? "Delivery in 2-4 days" : leadDigit <= 6 ? "Delivery in 3-5 days" : "Delivery in 4-6 days";
    setDeliveryResult({ text: estimate, cod: true });
    toast({ title: "Delivery checked", description: `${estimate}. Cash on Delivery is available.` });
  };

  const handleMoveToWishlist = (item: CartItem) => {
    if (!wishlistHas(item.productId)) {
      toggleWishlist(item.productId);
    }
    removeItem(item.productId, item.variantId, item.shadeId, item.packSize, item.finish);
    toast({
      title: "Moved to wishlist",
      description: `${item.name} was removed from cart and saved to your wishlist.`,
      variant: "success",
    });
  };

  const handleProceedToCheckout = async () => {
    if (!(await flushSync())) {
      toast({
        title: "Cart is still syncing",
        description: "Please try checkout again in a moment.",
        variant: "danger",
      });
      return;
    }
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
  const qualifyingAmount = useMemo(() => getResolvedCartTaxableAmount(items), [items]);
  const displayPricing = useMemo(() => {
    if (!freeDeliveryConfig) {
      return { ...pricing, shipping: null, grandTotal: null };
    }
    const shipping = getConfiguredShippingAmount(freeDeliveryConfig, qualifyingAmount);
    return {
      ...pricing,
      taxableAmount: qualifyingAmount,
      shipping,
      grandTotal: Math.max(0, pricing.grandTotal - pricing.shipping + shipping),
    };
  }, [freeDeliveryConfig, pricing, qualifyingAmount]);

  useEffect(() => {
    setCouponInput(couponCode ?? "");
  }, [couponCode]);

  useEffect(() => {
    let cancelled = false;
    void loadFreeDeliveryConfig(getSupabaseBrowserClient()).then((config) => {
      if (!cancelled) setFreeDeliveryConfig(config);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) {
    return (
      <section className="border-border surface-texture relative isolate overflow-hidden border-b">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
          <div className="animate-pulse space-y-4 rounded-[1.75rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
            <div className="bg-background-secondary h-4 w-28 rounded-full" />
            <div className="bg-background-secondary h-10 w-56 rounded-2xl" />
            <div className="bg-background-secondary h-5 w-2/3 rounded-full" />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-4">
                <div className="bg-background-secondary h-40 rounded-[1.5rem]" />
                <div className="bg-background-secondary h-40 rounded-[1.5rem]" />
              </div>
              <div className="bg-background-secondary h-72 rounded-[1.5rem]" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <motion.section
      className="border-border surface-texture relative isolate overflow-hidden border-b"
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "visible"}
      variants={SECTION_VARIANTS}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-12 -left-24 h-80 w-80 rounded-full bg-orange-300/6 blur-3xl" />
        <div className="absolute top-20 right-0 h-72 w-72 rounded-full bg-sky-300/6 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pt-6 pb-40 sm:px-6 sm:pt-8 sm:pb-44 lg:pb-14">
        <motion.nav
          aria-label="Breadcrumb"
          className="text-muted mb-5 flex items-center gap-2 text-sm font-medium"
          variants={ITEM_VARIANTS}
        >
          <Link href="/" className="hover:text-text transition-colors">
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
              <h1 className="text-text mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Shopping Cart
              </h1>
              <p className="text-muted mt-2 text-sm font-medium sm:text-base">
                Review, adjust, and check out faster.
              </p>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-accent shrink-0 px-2"
            >
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </div>
        </motion.header>

        {freeDeliveryConfig ? (
          <FreeDeliveryProgress
            config={freeDeliveryConfig}
            qualifyingAmount={qualifyingAmount}
            itemCount={totalItems}
          />
        ) : null}

        {mode === "authenticated" && mergeAvailable && (
          <Card className="border-accent/20 from-accent/10 mb-5 rounded-[1.35rem] border bg-gradient-to-r via-white to-white p-4 shadow-[var(--shadow-sm)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-text text-sm font-bold">Guest cart detected</p>
                <p className="text-muted mt-1 text-sm font-medium">
                  {guestItemCount} saved guest item{guestItemCount === 1 ? "" : "s"} can
                  be merged into your account.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  onClick={() => void mergeGuestCart()}
                >
                  Merge Guest Cart
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={dismissGuestMerge}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </Card>
        )}

        {syncError ? (
          <Card className="border-warning/20 bg-warning/10 mb-5 rounded-[1.35rem] border p-4 shadow-[var(--shadow-sm)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-text text-sm font-bold">Cart sync needs another try</p>
                <p className="text-muted mt-1 text-sm font-medium">{syncError}</p>
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
              <div className="border-border/70 mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] border bg-white/90 shadow-[var(--shadow-sm)]">
                <ShoppingCart className="text-accent h-7 w-7" aria-hidden="true" />
              </div>
              <h2 className="text-text mt-4 text-2xl font-bold">Your cart is empty</h2>
              <p className="text-muted mx-auto mt-2 max-w-xl text-sm leading-7 font-medium">
                Add premium products from our Paint and Plumbing catalog to start building
                your order.
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
                const itemKey = buildCartItemKey(item);

                return (
                  <CartLineItem
                    key={itemKey}
                    product={product}
                    quantity={item.quantity}
                    shadeName={item.shadeName}
                    shadeCode={item.shadeCode}
                    shadeFamily={item.shadeFamily}
                    shadeHexColor={item.shadeHexColor}
                    selectedVariant={
                      (selectedVariants[itemKey] ?? item.variant) ||
                      getVariantOptions(product.category)[0] ||
                      "Standard"
                    }
                    maxQuantity={maxQuantity}
                    onQuantityChange={(nextQuantity) =>
                      updateQuantity(
                        item.productId,
                        Math.max(
                          1,
                          maxQuantity
                            ? Math.min(maxQuantity, nextQuantity)
                            : nextQuantity,
                        ),
                        item.variantId,
                        item.shadeId,
                        item.packSize,
                        item.finish,
                      )
                    }
                    onVariantChange={(variant) =>
                      setSelectedVariants((current) => ({
                        ...current,
                        [itemKey]: variant,
                      }))
                    }
                    onRemove={() =>
                      removeItem(
                        item.productId,
                        item.variantId,
                        item.shadeId,
                        item.packSize,
                        item.finish,
                      )
                    }
                    onMoveToWishlist={() => handleMoveToWishlist(item)}
                    onShare={() => handleShare(product)}
                    codAvailable={deliveryResult.cod}
                  />
                );
              })}

              <div className="grid gap-3 lg:grid-cols-2">
              <details
                className="rounded-[1.35rem] border border-white/80 bg-white/92 shadow-[var(--shadow-sm)]"
                open
              >
                <summary className="text-text focus-visible:ring-accent flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-bold focus-visible:ring-2 focus-visible:outline-none">
                  <span className="inline-flex items-center gap-2">
                    <BadgePercent className="text-accent h-4 w-4" aria-hidden="true" />
                    Have a coupon?
                  </span>
                  <span className="text-accent inline-flex items-center gap-1">
                    Apply Coupon
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </span>
                </summary>
                <div className="px-4 pb-3">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Input
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value)}
                      placeholder="Coupon Code"
                      aria-label="Coupon Code"
                      className="border-border/80 h-11 rounded-full bg-white/90"
                    />
                    <Button
                      type="button"
                      variant="accent"
                      size="md"
                      onClick={handleApplyCoupon}
                    >
                      Apply
                    </Button>
                  </div>
                  {couponMessage && (
                    <p
                      className={cn(
                        "mt-3 text-sm font-medium",
                        couponCode ? "text-success" : "text-muted",
                      )}
                    >
                      {couponMessage}
                    </p>
                  )}
                </div>
              </details>

              <Card className="rounded-[1.35rem] border-white/75 bg-white/92 p-3 shadow-[var(--shadow-sm)]">
                <div className="mb-2 flex items-center gap-2">
                  <Truck className="text-accent h-4 w-4" aria-hidden="true" />
                  <h2 className="text-text text-base font-bold">Delivery Check</h2>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    value={pincode}
                    onChange={(event) => setPincode(event.target.value)}
                    placeholder="Pincode"
                    aria-label="Pincode"
                    maxLength={6}
                    inputMode="numeric"
                    className="border-border/80 h-11 rounded-full bg-white/90"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => void handleCheckDelivery()}
                    loading={deliveryChecking}
                  >
                    Check Delivery
                  </Button>
                </div>
                <div className="border-border/70 bg-background-secondary/35 mt-2 grid gap-1.5 rounded-[1rem] border p-2.5 text-sm">
                  <p className="text-text font-bold">{deliveryResult.text}</p>
                  <p className="text-muted font-medium">
                    {deliveryResult.cod ? "COD Available" : deliveryResult.text === UNAVAILABLE_PINCODE_MESSAGE ? "" : "Enter a 6-digit pincode to check delivery."}
                  </p>
                </div>
              </Card>
              </div>
            </div>

            <div className="space-y-4">
              <div className="hidden lg:sticky lg:top-24 lg:block">
                <OrderSummaryCard
                  subtotal={displayPricing.subtotal}
                  discount={displayPricing.discount}
                  gst={displayPricing.gst}
                  shipping={displayPricing.shipping}
                  couponDiscount={displayPricing.couponDiscount}
                  total={displayPricing.grandTotal}
                  appliedCoupon={couponCode}
                  onProceed={handleProceedToCheckout}
                />
              </div>

              <details
                className="rounded-[1.35rem] border border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)] lg:hidden"
                open
              >
                <summary className="text-text focus-visible:ring-accent flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold focus-visible:ring-2 focus-visible:outline-none">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="text-accent h-4 w-4" aria-hidden="true" />
                    Order Summary
                  </span>
                  <ChevronDown className="text-muted h-4 w-4" aria-hidden="true" />
                </summary>
                <div className="mt-4">
                  <OrderSummaryCard
                    subtotal={displayPricing.subtotal}
                    discount={displayPricing.discount}
                    gst={displayPricing.gst}
                    shipping={displayPricing.shipping}
                    couponDiscount={displayPricing.couponDiscount}
                    total={displayPricing.grandTotal}
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
          <div className="border-border/70 mx-auto max-w-2xl rounded-[1.3rem] border bg-white/98 px-3 py-2 shadow-[var(--shadow-lg)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2.5">
              <div>
                <p className="text-muted text-[11px] font-semibold tracking-[0.2em] uppercase">
                  Grand Total
                </p>
                <p className="text-text text-[1.05rem] font-bold">
                  {displayPricing.grandTotal === null ? "Unavailable" : formatPrice(displayPricing.grandTotal)}
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleProceedToCheckout}
                className="h-11 px-4"
              >
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
